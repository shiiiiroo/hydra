from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app import schemas
from app.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.auth_deps import get_current_user, require_role
from app.audit import log_action
from app.rate_limit import limiter
from app.settings import get_settings

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=schemas.Token)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()

    # Намеренно одинаковое сообщение для "нет такого пользователя" и "неверный
    # пароль" — не давать атакующему подтверждение существования логина.
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")

    if not user or not verify_password(form_data.password, user.password_hash):
        log_action(db, form_data.username, "auth.login_failed", ip_address=request.client.host if request.client else None)
        raise invalid
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Учётная запись отключена")

    user.last_login_at = datetime.utcnow()
    db.commit()
    log_action(db, user.username, "auth.login", ip_address=request.client.host if request.client else None)

    return schemas.Token(
        access_token=create_access_token(user.username, user.role),
        refresh_token=create_refresh_token(user.username, user.role),
        role=user.role,
        username=user.username,
    )


@router.post("/refresh", response_model=schemas.Token)
def refresh(payload: schemas.RefreshRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный refresh-токен")

    user = db.query(User).filter(User.username == data.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден или отключён")

    return schemas.Token(
        access_token=create_access_token(user.username, user.role),
        refresh_token=create_refresh_token(user.username, user.role),
        role=user.role,
        username=user.username,
    )


@router.get("/me", response_model=schemas.UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/change-password")
def change_password(payload: schemas.PasswordChange, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Текущий пароль указан неверно")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Новый пароль должен быть не короче 8 символов")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    log_action(db, user.username, "auth.password_change")
    return {"ok": True}


# --------------------------------------------------------------------------
# Управление пользователями — только admin. Это прямой ответ на требование
# "только админ может менять данные / выдавать права админа".
# --------------------------------------------------------------------------

@router.get("/users", response_model=list[schemas.UserOut], dependencies=[Depends(require_role("admin"))])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@router.post("/users", response_model=schemas.UserOut, dependencies=[Depends(require_role("admin"))])
def create_user(payload: schemas.UserCreate, actor: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    if payload.role not in ("admin", "inspector", "viewer"):
        raise HTTPException(400, "Недопустимая роль")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(400, "Пользователь с таким логином уже существует")
    if len(payload.password) < 8:
        raise HTTPException(400, "Пароль должен быть не короче 8 символов")

    user = User(
        username=payload.username, email=payload.email, full_name=payload.full_name,
        password_hash=hash_password(payload.password), role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, actor.username, "user.create", "user", user.id, f"role={payload.role}")
    return user


@router.put("/users/{user_id}", response_model=schemas.UserOut, dependencies=[Depends(require_role("admin"))])
def update_user(user_id: int, payload: schemas.UserUpdate, actor: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    target = db.query(User).get(user_id)
    if not target:
        raise HTTPException(404, "Пользователь не найден")
    if payload.role is not None:
        if payload.role not in ("admin", "inspector", "viewer"):
            raise HTTPException(400, "Недопустимая роль")
        if target.id == actor.id and payload.role != "admin":
            raise HTTPException(400, "Нельзя понизить роль собственной учётной записи")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(target, field, value)
    db.commit()
    db.refresh(target)
    log_action(db, actor.username, "user.update", "user", target.id, str(data))
    return target


@router.delete("/users/{user_id}", dependencies=[Depends(require_role("admin"))])
def delete_user(user_id: int, actor: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    if user_id == actor.id:
        raise HTTPException(400, "Нельзя удалить собственную учётную запись")
    target = db.query(User).get(user_id)
    if not target:
        raise HTTPException(404, "Пользователь не найден")
    db.delete(target)
    db.commit()
    log_action(db, actor.username, "user.delete", "user", user_id)
    return {"ok": True}


@router.get("/audit-log", response_model=list[schemas.AuditLogOut], dependencies=[Depends(require_role("admin"))])
def audit_log(limit: int = 200, db: Session = Depends(get_db)):
    from app.models import AuditLog
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(limit, 1000)).all()
