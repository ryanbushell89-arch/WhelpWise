import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image,
)

# ── Palette ────────────────────────────────────────────────────────────────
C_PRIMARY    = colors.HexColor('#2C3E50')
C_ACCENT     = colors.HexColor('#3498DB')
C_LIGHT      = colors.HexColor('#F8F9FA')
C_BORDER     = colors.HexColor('#DEE2E6')
C_TEXT       = colors.HexColor('#2C3E50')
C_MUTED      = colors.HexColor('#6C757D')
C_WHITE      = colors.white

PAGE_W = A4[0] - 30 * mm   # usable width (15 mm margins each side)


def _style(name, **kw):
    return ParagraphStyle(name, **kw)


# Shared styles
S_LABEL   = _style('lbl',  fontSize=7,  fontName='Helvetica-Bold', textColor=C_PRIMARY, spaceAfter=1)
S_VALUE   = _style('val',  fontSize=9,  textColor=C_TEXT, leading=13)
S_MUTED   = _style('mut',  fontSize=8,  textColor=C_MUTED, leading=12)
S_TH      = _style('th',   fontSize=9,  fontName='Helvetica-Bold', textColor=C_WHITE)
S_TH_R    = _style('thr',  fontSize=9,  fontName='Helvetica-Bold', textColor=C_WHITE, alignment=TA_RIGHT)
S_TH_C    = _style('thc',  fontSize=9,  fontName='Helvetica-Bold', textColor=C_WHITE, alignment=TA_CENTER)
S_TD      = _style('td',   fontSize=9,  textColor=C_TEXT)
S_TD_R    = _style('tdr',  fontSize=9,  textColor=C_TEXT, alignment=TA_RIGHT)
S_TD_C    = _style('tdc',  fontSize=9,  textColor=C_TEXT, alignment=TA_CENTER)
S_TOTAL_L = _style('totl', fontSize=11, fontName='Helvetica-Bold', textColor=C_WHITE, alignment=TA_RIGHT)
S_TOTAL_V = _style('totv', fontSize=11, fontName='Helvetica-Bold', textColor=C_WHITE, alignment=TA_RIGHT)


class InvoicePDF:
    """Generates ATO-compliant Tax Invoice / Quote PDFs using ReportLab."""

    def __init__(self, settings: dict):
        self.s = settings

    def generate(self, invoice_data: dict, customer: dict, items: list, output_path: str) -> str:
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=15 * mm, leftMargin=15 * mm,
            topMargin=15 * mm,   bottomMargin=20 * mm,
            title=invoice_data.get('invoice_number', ''),
            author=self.s.get('company_name', ''),
        )

        story = []
        story += self._header(invoice_data)
        story.append(Spacer(1, 6 * mm))
        story += self._details_section(invoice_data, customer)
        story.append(Spacer(1, 6 * mm))
        story += self._line_items(items)
        story.append(Spacer(1, 3 * mm))
        story += self._totals(invoice_data)

        if self._has_bank():
            story.append(Spacer(1, 6 * mm))
            story += self._payment()

        notes = (invoice_data.get('notes') or '').strip()
        if notes:
            story.append(Spacer(1, 5 * mm))
            story += self._notes(notes)

        doc.build(
            story,
            onFirstPage=self._draw_footer,
            onLaterPages=self._draw_footer,
        )
        return output_path

    # ── Sections ───────────────────────────────────────────────────────────

    def _header(self, inv):
        doc_label = 'TAX INVOICE' if inv['type'] == 'invoice' else 'QUOTE'

        # Left: logo or company name
        left = []
        logo = self.s.get('company_logo', '')
        if logo and os.path.exists(logo):
            try:
                img = Image(logo)
                max_h, max_w = 22 * mm, 70 * mm
                ratio = img.imageWidth / img.imageHeight
                img.drawHeight = min(max_h, max_w / ratio)
                img.drawWidth  = img.drawHeight * ratio
                if img.drawWidth > max_w:
                    img.drawWidth  = max_w
                    img.drawHeight = max_w / ratio
                left.append(img)
            except Exception:
                left.append(Paragraph(self.s.get('company_name', ''), _style('cn', fontSize=15, fontName='Helvetica-Bold', textColor=C_PRIMARY)))
        else:
            left.append(Paragraph(
                self.s.get('company_name', ''),
                _style('cn', fontSize=15, fontName='Helvetica-Bold', textColor=C_PRIMARY)
            ))

        for line in self._company_lines():
            left.append(Paragraph(line, S_MUTED))

        # Right: document type
        right = [Paragraph(doc_label, _style('dt', fontSize=26, fontName='Helvetica-Bold', textColor=C_PRIMARY, alignment=TA_RIGHT))]

        tbl = Table([[left, right]], colWidths=[PAGE_W * 0.6, PAGE_W * 0.4])
        tbl.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN',  (1, 0), (1, 0),   'RIGHT'),
        ]))
        return [tbl, HRFlowable(width='100%', thickness=2, color=C_PRIMARY)]

    def _details_section(self, inv, cust):
        # Bill To
        bill = [Paragraph('BILL TO', S_LABEL)]
        biz  = (cust.get('business_name') or '').strip()
        name = (cust.get('name') or '').strip()
        if biz:
            bill.append(Paragraph(f'<b>{biz}</b>', S_VALUE))
            if name:
                bill.append(Paragraph(name, S_MUTED))
        elif name:
            bill.append(Paragraph(f'<b>{name}</b>', S_VALUE))

        addr = (cust.get('address') or '').strip()
        for ln in addr.split('\n'):
            if ln.strip():
                bill.append(Paragraph(ln.strip(), S_MUTED))

        email = (cust.get('email') or '').strip()
        if email:
            bill.append(Paragraph(email, S_MUTED))
        abn = (cust.get('abn') or '').strip()
        if abn:
            bill.append(Paragraph(f'ABN: {abn}', S_MUTED))

        # Invoice meta
        rl = _style('irl', fontSize=8, fontName='Helvetica-Bold', textColor=C_PRIMARY,  alignment=TA_RIGHT)
        rv = _style('irv', fontSize=9, textColor=C_TEXT, alignment=TA_RIGHT)

        meta = [[Paragraph('INVOICE NUMBER', rl), Paragraph(inv['invoice_number'], rv)],
                [Paragraph('DATE ISSUED',    rl), Paragraph(inv.get('date', ''),   rv)]]
        if inv.get('due_date') and inv['type'] == 'invoice':
            meta.append([Paragraph('PAYMENT DUE', rl), Paragraph(inv['due_date'], rv)])

        meta_tbl = Table(meta, colWidths=[PAGE_W * 0.22, PAGE_W * 0.22])
        meta_tbl.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ]))

        outer = Table([[bill, meta_tbl]], colWidths=[PAGE_W * 0.55, PAGE_W * 0.45])
        outer.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        return [outer]

    def _line_items(self, items):
        data = [[
            Paragraph('DESCRIPTION', S_TH),
            Paragraph('QTY',         S_TH_C),
            Paragraph('UNIT PRICE',  S_TH_R),
            Paragraph('AMOUNT',      S_TH_R),
        ]]

        row_bgs = []
        for i, item in enumerate(items, start=1):
            qty   = float(item.get('quantity', 1))
            price = float(item.get('unit_price', 0))
            amt   = qty * price
            qty_s = str(int(qty)) if qty == int(qty) else f'{qty:.2f}'

            data.append([
                Paragraph(str(item.get('description', '')), S_TD),
                Paragraph(qty_s,              S_TD_C),
                Paragraph(f'${price:,.2f}',   S_TD_R),
                Paragraph(f'${amt:,.2f}',     S_TD_R),
            ])
            if i % 2 == 0:
                row_bgs.append(('BACKGROUND', (0, i), (-1, i), C_LIGHT))

        col_w = [PAGE_W * 0.55, PAGE_W * 0.10, PAGE_W * 0.175, PAGE_W * 0.175]
        tbl = Table(data, colWidths=col_w, repeatRows=1)

        style = [
            ('BACKGROUND',    (0, 0), (-1, 0),  C_PRIMARY),
            ('LINEBELOW',     (0, 0), (-1, 0),  2, C_PRIMARY),
            ('TOPPADDING',    (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LINEBELOW',     (0, 1), (-1, -1), 0.5, C_BORDER),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ] + row_bgs

        tbl.setStyle(TableStyle(style))
        return [tbl]

    def _totals(self, inv):
        sub  = float(inv.get('subtotal', 0))
        gst  = float(inv.get('gst', 0))
        tot  = float(inv.get('total', 0))

        rl = _style('totlbl', fontSize=9, textColor=C_TEXT,  alignment=TA_RIGHT)
        rv = _style('totval', fontSize=9, textColor=C_TEXT,  alignment=TA_RIGHT)

        data = [
            [Paragraph('Subtotal (excl. GST)', rl), Paragraph(f'${sub:,.2f}', rv)],
            [Paragraph('GST (10%)',             rl), Paragraph(f'${gst:,.2f}', rv)],
            [Paragraph('TOTAL (incl. GST)',  S_TOTAL_L), Paragraph(f'${tot:,.2f}', S_TOTAL_V)],
        ]

        tbl = Table(data, colWidths=[PAGE_W * 0.75, PAGE_W * 0.25], hAlign='RIGHT')
        tbl.setStyle(TableStyle([
            ('ALIGN',         (0, 0), (-1, -1), 'RIGHT'),
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',    (0, 0), (-1, -2), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -2), 4),
            ('LINEBELOW',     (0, 0), (-1, -2), 0.5, C_BORDER),
            ('BACKGROUND',    (0, -1), (-1, -1), C_PRIMARY),
            ('TOPPADDING',    (0, -1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
        ]))
        return [tbl]

    def _has_bank(self):
        return any(self.s.get(k) for k in ('bank_name', 'bank_bsb', 'bank_account'))

    def _payment(self):
        rl = _style('bpl', fontSize=8, fontName='Helvetica-Bold', textColor=C_PRIMARY)
        rv = _style('bpv', fontSize=8, textColor=C_TEXT)

        rows = []
        for key, label in [('bank_name', 'Bank'), ('bank_account_name', 'Account Name'),
                            ('bank_bsb', 'BSB'), ('bank_account', 'Account No.')]:
            val = self.s.get(key, '').strip()
            if val:
                rows.append([Paragraph(label + ':', rl), Paragraph(val, rv)])

        if not rows:
            return []

        tbl = Table(rows, colWidths=[30 * mm, 90 * mm])
        tbl.setStyle(TableStyle([
            ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING',    (0, 0), (-1, -1), 2),
        ]))
        return [
            HRFlowable(width='100%', thickness=0.5, color=C_BORDER),
            Spacer(1, 3 * mm),
            Paragraph('PAYMENT DETAILS', S_LABEL),
            Spacer(1, 2 * mm),
            tbl,
        ]

    def _notes(self, notes):
        ns = _style('ns', fontSize=8, textColor=C_TEXT, leading=12)
        return [
            HRFlowable(width='100%', thickness=0.5, color=C_BORDER),
            Spacer(1, 3 * mm),
            Paragraph('NOTES', S_LABEL),
            Spacer(1, 2 * mm),
            Paragraph(notes.replace('\n', '<br/>'), ns),
        ]

    def _company_lines(self):
        lines = []
        abn  = self.s.get('company_abn', '').strip()
        addr = self.s.get('company_address', '').strip()
        if abn:
            lines.append(f'ABN: {abn}')
        for ln in addr.split('\n'):
            if ln.strip():
                lines.append(ln.strip())
        email = self.s.get('company_email', '').strip()
        phone = self.s.get('company_phone', '').strip()
        if email:
            lines.append(email)
        if phone:
            lines.append(phone)
        return lines

    def _draw_footer(self, canv, doc):
        canv.saveState()
        company = self.s.get('company_name', '')
        abn     = self.s.get('company_abn', '')
        footer  = company
        if abn:
            footer += f'  |  ABN: {abn}'
        canv.setFont('Helvetica', 7)
        canv.setFillColor(C_MUTED)
        canv.drawCentredString(A4[0] / 2, 10 * mm, footer)
        canv.drawRightString(A4[0] - 15 * mm, 10 * mm, f'Page {doc.page}')
        canv.restoreState()
