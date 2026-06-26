from __future__ import annotations

import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts")

_REGISTERED = False


def ensure_fonts():
    """Регистрирует DejaVu Sans (поддержка кириллицы) -- по умолчанию у ReportLab её нет."""
    global _REGISTERED
    if _REGISTERED:
        return
    pdfmetrics.registerFont(TTFont("DejaVu", os.path.join(FONT_DIR, "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))
    _REGISTERED = True


BRAND_DARK = colors.HexColor("#0f172a")
BRAND_BLUE = colors.HexColor("#2563eb")
ROW_ALT = colors.HexColor("#f1f5f9")
STATUS_COLORS = {
    "ok": colors.HexColor("#16a34a"),
    "watch": colors.HexColor("#ca8a04"),
    "repair": colors.HexColor("#ea580c"),
    "critical": colors.HexColor("#dc2626"),
}
STATUS_LABELS = {
    "ok": "Исправное состояние",
    "watch": "Требует наблюдения",
    "repair": "Требует ремонта",
    "critical": "Аварийное состояние",
}


def get_styles():
    ensure_fonts()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="HM_Title", fontName="DejaVu-Bold", fontSize=18, leading=22, textColor=BRAND_DARK, spaceAfter=4))
    styles.add(ParagraphStyle(name="HM_Subtitle", fontName="DejaVu", fontSize=10, leading=13, textColor=colors.HexColor("#475569"), spaceAfter=10))
    styles.add(ParagraphStyle(name="HM_H2", fontName="DejaVu-Bold", fontSize=13, leading=16, textColor=BRAND_DARK, spaceBefore=12, spaceAfter=6))
    styles.add(ParagraphStyle(name="HM_Body", fontName="DejaVu", fontSize=9.5, leading=13))
    styles.add(ParagraphStyle(name="HM_Small", fontName="DejaVu", fontSize=8, leading=11, textColor=colors.HexColor("#64748b")))
    styles.add(ParagraphStyle(name="HM_Cell", fontName="DejaVu", fontSize=8.5, leading=11))
    styles.add(ParagraphStyle(name="HM_CellBold", fontName="DejaVu-Bold", fontSize=8.5, leading=11))
    return styles


def header_block(styles, title: str, subtitle: str):
    return [
        Paragraph("HydroMonitor — Жамбылская область", styles["HM_Small"]),
        Paragraph(title, styles["HM_Title"]),
        Paragraph(subtitle, styles["HM_Subtitle"]),
    ]


def footer_note(styles):
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    return Paragraph(
        f"Сформировано автоматически системой HydroMonitor {now}. "
        f"Координаты на карте и статус по риск-скору — расчётные данные (см. методологию в разделе «Категории»).",
        styles["HM_Small"],
    )


def make_table(header_row, body_rows, col_widths, styles, status_col_index: int | None = None):
    data = [[Paragraph(str(h), styles["HM_CellBold"]) for h in header_row]]
    for row in body_rows:
        data.append([Paragraph(str(c) if c is not None else "—", styles["HM_Cell"]) for c in row])

    table = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "DejaVu-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))
    table.setStyle(TableStyle(style_cmds))
    return table


def page_size_for(n_cols: int):
    return landscape(A4) if n_cols > 6 else A4
