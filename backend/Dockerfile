FROM python:3.12-slim

WORKDIR /app

# Системные зависимости для reportlab (шрифты) и xlrd
RUN apt-get update && apt-get install -y --no-install-recommends \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Непривилегированный пользователь — не запускаем процесс под root
RUN useradd -m -u 1000 hydromonitor && chown -R hydromonitor:hydromonitor /app
USER hydromonitor

EXPOSE 8000

# Перед запуском: применить миграции, затем поднять сервер.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
