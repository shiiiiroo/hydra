from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from reportlab.platypus import SimpleDocTemplate, Spacer, Paragraph, Table, TableStyle
from reportlab.lib.units import mm
from reportlab.lib import colors

from app.database import get_db
from app.models import HydroObject, User
from app import pdf_utils
from app.config import STATUS_META
from app.auth_deps import get_current_user
from app.routers.objects import _apply_filters

router = APIRouter(prefix="/api/reports", tags=["reports"])

STATUS_LABELS = pdf_utils.STATUS_LABELS

REPORT_DEFINITIONS = [
    {
        "id": "summary",
        "title": "Сводный отчёт по региону",
        "description": "Все объекты, статусы, средний износ, разбивка по районам",
        "formats": ["pdf", "csv"],
        "needs_district": False,
    },
    {
        "id": "attention",
        "title": "Объекты, требующие внимания",
        "description": "Статусы «Ремонт» и «Авария», отсортировано по риск-скору",
        "formats": ["pdf", "csv"],
        "needs_district": False,
    },
    {
        "id": "district",
        "title": "Отчёт по району",
        "description": "Фильтр по одному району — для локальных служб",
        "formats": ["pdf", "csv"],
        "needs_district": True,
    },
    {
        "id": "inspection_schedule",
        "title": "График осмотров",
        "description": "Список объектов с датой следующей рекомендованной проверки",
        "formats": ["pdf", "csv"],
        "needs_district": False,
    },
]


@router.get("")
def list_reports(user: User = Depends(get_current_user)):
    return REPORT_DEFINITIONS


def _row_for_object(o: HydroObject):
    return [
        o.code,
        o.district_raw or "—",
        o.water_source or "—",
        o.commission_year or "—",
        f"{o.wear_percent:.1f}" if o.wear_percent is not None else "—",
        o.condition_source or "—",
        STATUS_LABELS[o.status],
        f"{o.risk_score:.1f}",
    ]


HEADER_COMMON = ["Код", "Район (источник)", "Водоисточник", "Год ввода", "Износ, %", "Тех. состояние (источник)", "Расчётный статус", "Риск-скор"]


def _get_queryset(db: Session, report_id: str, anchor_key: Optional[str]):
    query = db.query(HydroObject)
    if report_id == "attention":
        query = query.filter(HydroObject.status.in_(["repair", "critical"]))
        query = query.order_by(HydroObject.risk_score.desc())
    elif report_id == "district":
        if not anchor_key:
            raise HTTPException(400, "Для отчёта по району нужен параметр anchor_key")
        query = query.filter(HydroObject.anchor_key == anchor_key)
        query = query.order_by(HydroObject.risk_score.desc())
    elif report_id == "inspection_schedule":
        query = query.order_by(HydroObject.next_inspection_date.asc())
    else:  # summary
        query = query.order_by(HydroObject.risk_score.desc())
    return query


def _csv_response(filename: str, header: list[str], rows: list[list]):
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(header)
    writer.writerows(rows)
    data = ("\ufeff" + buf.getvalue()).encode("utf-8")  # BOM -- чтобы Excel сразу подхватил кириллицу/UTF-8
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _pdf_response(filename: str, build_fn):
    buf = io.BytesIO()
    build_fn(buf)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{report_id}/download")
def download_report(
    report_id: str,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    anchor_key: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    defs = {d["id"]: d for d in REPORT_DEFINITIONS}
    if report_id not in defs:
        raise HTTPException(404, "Неизвестный тип отчёта")

    objects = _get_queryset(db, report_id, anchor_key).all()
    meta = defs[report_id]

    if report_id == "inspection_schedule":
        header = ["Код", "Район (источник)", "Статус", "Дата последнего осмотра", "Следующий осмотр", "Просрочен"]
        rows = [
            [
                o.code, o.district_raw or "—", STATUS_LABELS[o.status],
                o.last_inspection_date.isoformat() if o.last_inspection_date else "—",
                o.next_inspection_date.isoformat() if o.next_inspection_date else "—",
                "Да" if (o.next_inspection_date and o.next_inspection_date < datetime.now().date()) else "Нет",
            ]
            for o in objects
        ]
    else:
        header = HEADER_COMMON
        rows = [_row_for_object(o) for o in objects]

    today_str = datetime.now().strftime("%d.%m.%Y")
    district_label = None
    if report_id == "district" and objects:
        district_label = objects[0].anchor_name

    if format == "csv":
        fname = f"hydromonitor_{report_id}_{datetime.now().strftime('%Y%m%d')}.csv"
        return _csv_response(fname, header, rows)

    def build(buf):
        styles = pdf_utils.get_styles()
        n_cols = len(header)
        doc = SimpleDocTemplate(
            buf, pagesize=pdf_utils.page_size_for(n_cols),
            leftMargin=15 * mm, rightMargin=15 * mm, topMargin=15 * mm, bottomMargin=15 * mm,
        )
        subtitle = meta["description"]
        if district_label:
            subtitle = f"{subtitle} — {district_label}"
        elems = pdf_utils.header_block(styles, meta["title"], f"{subtitle}. Дата формирования: {today_str}. Объектов в выборке: {len(objects)}.")
        elems.append(Spacer(1, 6))

        avail_width = doc.width
        col_widths = [avail_width / n_cols] * n_cols
        elems.append(pdf_utils.make_table(header, rows, col_widths, styles))
        elems.append(Spacer(1, 10))
        elems.append(pdf_utils.footer_note(styles))
        doc.build(elems)

    fname = f"hydromonitor_{report_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return _pdf_response(fname, build)


@router.get("/objects/{object_id}/passport")
def object_passport_pdf(object_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    obj = db.query(HydroObject).get(object_id)
    if not obj:
        raise HTTPException(404, "Объект не найден")

    def build(buf):
        styles = pdf_utils.get_styles()
        doc = SimpleDocTemplate(
            buf, pagesize=pdf_utils.page_size_for(2),
            leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
        )
        elems = pdf_utils.header_block(
            styles, f"Паспорт объекта — {obj.display_name}",
            f"Код объекта: {obj.code}. Статус: {STATUS_LABELS[obj.status]}. Дата формирования: {datetime.now().strftime('%d.%m.%Y %H:%M')}.",
        )
        elems.append(Spacer(1, 6))

        rows = [
            ("Тип сооружения", "Канал"),
            ("Район (источник, обезличено)", obj.district_raw or "—"),
            ("Сельский округ (источник)", obj.rural_okrug_raw or "—"),
            ("Приближённые координаты", f"{obj.lat}, {obj.lng} ({obj.anchor_name})" if obj.lat else "—"),
            ("Водоисточник", obj.water_source or "—"),
            ("Год ввода в эксплуатацию", obj.commission_year or "—"),
            ("Пропускная способность, м³/с", obj.capacity_m3s or "—"),
            ("Протяжённость до реконструкции, км", obj.length_before_km or "—"),
            ("из них земляная, км", obj.length_before_earth_km or "—"),
            ("из них облицованная, км", obj.length_before_lined_km or "—"),
            ("Протяжённость после реконструкции, км", obj.length_after_km or "Реконструкция не проводилась"),
            ("Подвешенная площадь, га", obj.area_ha or "—"),
            ("КПД проектный / фактический", f"{obj.kpd_design or '—'} / {obj.kpd_actual or '—'}"),
            ("Процент износа (источник)", f"{obj.wear_percent}%" if obj.wear_percent is not None else "не указан в источнике"),
            ("Техническое состояние (источник)", obj.condition_source or "—"),
            ("Расчётный статус (риск-модель)", STATUS_LABELS[obj.status]),
            ("Риск-скор (0-100)", obj.risk_score),
            ("Уровень значимости", {"high": "Высокая", "medium": "Средняя", "low": "Низкая"}.get(obj.significance, obj.significance)),
            ("Кадастровый номер", obj.cadastre_number or "—"),
            ("Гос. акт", obj.gosakt_number or "—"),
            ("Дата последнего осмотра", obj.last_inspection_date.isoformat() if obj.last_inspection_date else "—"),
            ("Рекомендованная дата следующего осмотра", obj.next_inspection_date.isoformat() if obj.next_inspection_date else "—"),
            ("Описание", obj.description or "—"),
        ]
        table_data = [[Paragraph(k, styles["HM_CellBold"]), Paragraph(str(v), styles["HM_Cell"])] for k, v in rows]
        t = Table(table_data, colWidths=[70 * mm, doc.width - 70 * mm])
        t.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elems.append(t)
        elems.append(Spacer(1, 12))
        elems.append(pdf_utils.footer_note(styles))
        doc.build(elems)

    fname = f"passport_{obj.code}.pdf"
    return _pdf_response(fname, build)
