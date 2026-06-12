import os
from datetime import date, timedelta

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QFormLayout, QGroupBox,
    QPushButton, QLabel, QLineEdit, QComboBox, QDateEdit,
    QTextEdit, QDoubleSpinBox, QScrollArea, QFrame, QSizePolicy,
    QFileDialog, QMessageBox, QSpacerItem,
)
from PyQt6.QtCore import Qt, pyqtSignal, QDate
from PyQt6.QtGui import QFont

from pdf_generator import InvoicePDF


# ── Line-item row widget ────────────────────────────────────────────────────

class LineItemRow(QFrame):
    changed         = pyqtSignal()
    remove_requested = pyqtSignal(object)   # emits self

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFrameShape(QFrame.Shape.NoFrame)

        row = QHBoxLayout(self)
        row.setContentsMargins(0, 2, 0, 2)
        row.setSpacing(6)

        self.desc = QLineEdit()
        self.desc.setPlaceholderText("Description of goods / services supplied")

        self.qty = QDoubleSpinBox()
        self.qty.setRange(0.01, 99_999)
        self.qty.setValue(1.0)
        self.qty.setDecimals(2)
        self.qty.setFixedWidth(85)
        self.qty.setAlignment(Qt.AlignmentFlag.AlignRight)

        self.price = QDoubleSpinBox()
        self.price.setRange(0.00, 9_999_999)
        self.price.setDecimals(2)
        self.price.setPrefix("$")
        self.price.setFixedWidth(120)
        self.price.setAlignment(Qt.AlignmentFlag.AlignRight)

        self.amount = QLabel("$0.00")
        self.amount.setFixedWidth(100)
        self.amount.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        self.amount.setStyleSheet("font-weight: bold; color: #2C3E50; font-size: 12px;")

        btn_rm = QPushButton("✕")
        btn_rm.setObjectName("btnRemove")
        btn_rm.setFixedSize(28, 28)
        btn_rm.setToolTip("Remove this line")
        btn_rm.clicked.connect(lambda: self.remove_requested.emit(self))

        row.addWidget(self.desc,   5)
        row.addWidget(self.qty,    1)
        row.addWidget(self.price,  1)
        row.addWidget(self.amount, 1)
        row.addWidget(btn_rm)

        self.qty.valueChanged.connect(self._recalc)
        self.price.valueChanged.connect(self._recalc)

    def _recalc(self):
        amt = self.qty.value() * self.price.value()
        self.amount.setText(f"${amt:,.2f}")
        self.changed.emit()

    def line_total(self):
        return self.qty.value() * self.price.value()

    def get_values(self):
        return {
            'description': self.desc.text().strip(),
            'quantity':    self.qty.value(),
            'unit_price':  self.price.value(),
        }

    def set_values(self, description, qty, unit_price):
        self.desc.setText(description)
        self.qty.setValue(float(qty))
        self.price.setValue(float(unit_price))


# ── Invoice / Quote tab ─────────────────────────────────────────────────────

class InvoiceTab(QWidget):
    invoice_saved = pyqtSignal()

    def __init__(self, db, base_dir):
        super().__init__()
        self.db       = db
        self.base_dir = base_dir
        self._line_rows: list[LineItemRow] = []
        self._current_invoice_id = None     # None = unsaved

        self._build_ui()
        self.refresh_customers()
        self._reset_form()

    # ── UI construction ─────────────────────────────────────────────────

    def _build_ui(self):
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        container = QWidget()
        main = QVBoxLayout(container)
        main.setContentsMargins(16, 16, 16, 16)
        main.setSpacing(12)

        main.addLayout(self._build_top_row())
        main.addWidget(self._build_customer_group())
        main.addWidget(self._build_line_items_group())
        main.addLayout(self._build_bottom_row())
        main.addLayout(self._build_action_buttons())

        scroll.setWidget(container)
        outer.addWidget(scroll)

    def _build_top_row(self):
        row = QHBoxLayout()
        row.setSpacing(12)

        # Doc type group
        type_grp = QGroupBox("Document Type")
        type_layout = QHBoxLayout(type_grp)
        type_layout.setSpacing(8)

        self.cb_type = QComboBox()
        self.cb_type.addItems(["Tax Invoice", "Quote"])
        self.cb_type.setMinimumWidth(140)
        self.cb_type.currentIndexChanged.connect(self._on_type_change)
        type_layout.addWidget(self.cb_type)

        # Invoice number
        num_grp = QGroupBox("Reference Number")
        num_layout = QHBoxLayout(num_grp)
        self.f_number = QLineEdit()
        self.f_number.setPlaceholderText("Auto-generated")
        self.f_number.setMaximumWidth(160)
        num_layout.addWidget(QLabel("Number:"))
        num_layout.addWidget(self.f_number)

        # Dates
        date_grp = QGroupBox("Dates")
        date_layout = QFormLayout(date_grp)
        date_layout.setSpacing(6)
        self.f_date     = QDateEdit(QDate.currentDate())
        self.f_due_date = QDateEdit(QDate.currentDate().addDays(30))
        self.f_date.setCalendarPopup(True)
        self.f_due_date.setCalendarPopup(True)
        self.f_date.setDisplayFormat("dd/MM/yyyy")
        self.f_due_date.setDisplayFormat("dd/MM/yyyy")
        date_layout.addRow("Issue Date:", self.f_date)
        self.lbl_due = QLabel("Due Date:")
        date_layout.addRow(self.lbl_due, self.f_due_date)

        row.addWidget(type_grp,  1)
        row.addWidget(num_grp,   2)
        row.addWidget(date_grp,  3)
        return row

    def _build_customer_group(self):
        grp = QGroupBox("Customer / Bill To")
        layout = QHBoxLayout(grp)
        layout.setSpacing(16)

        # Left: dropdown
        left = QVBoxLayout()
        left.setSpacing(6)
        self.cb_customer = QComboBox()
        self.cb_customer.setMinimumWidth(220)
        self.cb_customer.currentIndexChanged.connect(self._on_customer_change)

        left.addWidget(QLabel("Select Customer:"))
        left.addWidget(self.cb_customer)
        note = QLabel("Select to auto-fill, or enter details manually below.")
        note.setObjectName("labelMuted")
        note.setWordWrap(True)
        left.addWidget(note)
        left.addStretch()

        # Right: form fields
        right = QFormLayout()
        right.setSpacing(7)
        right.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self.f_cust_name  = QLineEdit(); self.f_cust_name.setPlaceholderText("Contact name")
        self.f_cust_biz   = QLineEdit(); self.f_cust_biz.setPlaceholderText("Business / company name")
        self.f_cust_abn   = QLineEdit(); self.f_cust_abn.setPlaceholderText("xx xxx xxx xxx")
        self.f_cust_email = QLineEdit(); self.f_cust_email.setPlaceholderText("billing@example.com")
        self.f_cust_addr  = QTextEdit()
        self.f_cust_addr.setPlaceholderText("Street\nCity  State  Postcode")
        self.f_cust_addr.setMaximumHeight(68)

        right.addRow("Contact Name:",  self.f_cust_name)
        right.addRow("Business Name:", self.f_cust_biz)
        right.addRow("ABN:",           self.f_cust_abn)
        right.addRow("Email:",         self.f_cust_email)
        right.addRow("Address:",       self.f_cust_addr)

        layout.addLayout(left,  1)
        layout.addLayout(right, 3)
        return grp

    def _build_line_items_group(self):
        grp = QGroupBox("Line Items")
        outer = QVBoxLayout(grp)
        outer.setSpacing(6)

        # Column header
        hdr = QHBoxLayout()
        hdr.setContentsMargins(0, 0, 0, 0)
        hdr.setSpacing(6)

        def _hdr_lbl(text, stretch=1, align=Qt.AlignmentFlag.AlignLeft):
            lbl = QLabel(text)
            lbl.setStyleSheet("font-weight: bold; color: #2C3E50; font-size: 11px;")
            lbl.setAlignment(align)
            hdr.addWidget(lbl, stretch)

        _hdr_lbl("Description",  5)
        _hdr_lbl("Qty",          1, Qt.AlignmentFlag.AlignRight)
        _hdr_lbl("Unit Price",   1, Qt.AlignmentFlag.AlignRight)
        _hdr_lbl("Amount",       1, Qt.AlignmentFlag.AlignRight)
        hdr.addSpacing(34)   # aligns with remove button width
        outer.addLayout(hdr)

        # Scroll area for rows
        self._rows_widget = QWidget()
        self._rows_layout = QVBoxLayout(self._rows_widget)
        self._rows_layout.setContentsMargins(0, 0, 0, 0)
        self._rows_layout.setSpacing(2)

        outer.addWidget(self._rows_widget)

        # Add item button
        btn_add = QPushButton("+ Add Line Item")
        btn_add.setObjectName("btnSecondary")
        btn_add.setFixedWidth(160)
        btn_add.clicked.connect(self._add_line_item)
        outer.addWidget(btn_add, alignment=Qt.AlignmentFlag.AlignLeft)

        return grp

    def _build_bottom_row(self):
        row = QHBoxLayout()
        row.setSpacing(12)

        # Notes
        notes_grp = QGroupBox("Notes / Payment Terms")
        nl = QVBoxLayout(notes_grp)
        self.f_notes = QTextEdit()
        self.f_notes.setPlaceholderText(
            "e.g. Payment due within 30 days. Thank you for your business."
        )
        self.f_notes.setMaximumHeight(90)
        nl.addWidget(self.f_notes)

        # Totals
        totals_grp = QGroupBox("Totals")
        tl = QFormLayout(totals_grp)
        tl.setSpacing(8)
        tl.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        def _total_label(text, big=False):
            lbl = QLabel(text)
            lbl.setAlignment(Qt.AlignmentFlag.AlignRight)
            if big:
                f = lbl.font()
                f.setPointSize(13)
                f.setBold(True)
                lbl.setFont(f)
                lbl.setStyleSheet("color: #2C3E50;")
            return lbl

        self.lbl_subtotal = _total_label("$0.00")
        self.lbl_gst      = _total_label("$0.00")
        self.lbl_total    = _total_label("$0.00", big=True)

        tl.addRow("Subtotal (excl. GST):", self.lbl_subtotal)
        tl.addRow("GST (10%):",            self.lbl_gst)
        tl.addRow("TOTAL (incl. GST):",    self.lbl_total)

        row.addWidget(notes_grp, 2)
        row.addWidget(totals_grp, 1)
        return row

    def _build_action_buttons(self):
        row = QHBoxLayout()

        btn_clear = QPushButton("Clear Form")
        btn_clear.setObjectName("btnSecondary")
        btn_clear.setFixedWidth(120)
        btn_clear.clicked.connect(self._reset_form)

        self.btn_save = QPushButton("Save Invoice")
        self.btn_save.setObjectName("btnSuccess")
        self.btn_save.setFixedWidth(140)
        self.btn_save.clicked.connect(self._save)

        self.btn_pdf = QPushButton("Generate PDF")
        self.btn_pdf.setFixedWidth(160)
        self.btn_pdf.clicked.connect(self._generate_pdf)

        row.addWidget(btn_clear)
        row.addStretch()
        row.addWidget(self.btn_save)
        row.addWidget(self.btn_pdf)
        return row

    # ── Data helpers ────────────────────────────────────────────────────

    def refresh_customers(self):
        self.cb_customer.blockSignals(True)
        self.cb_customer.clear()
        self.cb_customer.addItem("-- Manual Entry --", userData=None)
        for c in self.db.get_customers():
            display = c['business_name'] or c['name']
            self.cb_customer.addItem(display, userData=c['id'])
        self.cb_customer.blockSignals(False)

    def _on_type_change(self, idx):
        is_invoice = (idx == 0)
        self.f_due_date.setEnabled(is_invoice)
        self.lbl_due.setEnabled(is_invoice)
        self.btn_save.setText("Save Invoice" if is_invoice else "Save Quote")

    def _on_customer_change(self, idx):
        customer_id = self.cb_customer.currentData()
        if customer_id is None:
            return
        c = self.db.get_customer(customer_id)
        if c:
            self.f_cust_name.setText(c['name']          or '')
            self.f_cust_biz.setText(c['business_name']  or '')
            self.f_cust_abn.setText(c['abn']            or '')
            self.f_cust_email.setText(c['email']        or '')
            self.f_cust_addr.setPlainText(c['address']  or '')

    # ── Line items ──────────────────────────────────────────────────────

    def _add_line_item(self, description='', qty=1.0, unit_price=0.0):
        row = LineItemRow()
        if description or unit_price:
            row.set_values(description, qty, unit_price)
        row.changed.connect(self._recalculate)
        row.remove_requested.connect(self._remove_line_item)
        self._line_rows.append(row)
        self._rows_layout.addWidget(row)
        self._recalculate()
        return row

    def _remove_line_item(self, row):
        if len(self._line_rows) <= 1:
            # Reset the last row instead of removing
            row.set_values('', 1.0, 0.0)
            return
        self._line_rows.remove(row)
        self._rows_layout.removeWidget(row)
        row.deleteLater()
        self._recalculate()

    def _recalculate(self):
        subtotal = sum(r.line_total() for r in self._line_rows)
        gst      = subtotal * 0.10
        total    = subtotal + gst
        self.lbl_subtotal.setText(f"${subtotal:,.2f}")
        self.lbl_gst.setText(f"${gst:,.2f}")
        self.lbl_total.setText(f"${total:,.2f}")

    # ── Form state ──────────────────────────────────────────────────────

    def _reset_form(self):
        self._current_invoice_id = None
        doc_type  = 'invoice' if self.cb_type.currentIndex() == 0 else 'quote'
        self.f_number.setText(self.db.next_invoice_number(doc_type))
        self.f_date.setDate(QDate.currentDate())
        days = int(self.db.get_setting('payment_terms', '30'))
        self.f_due_date.setDate(QDate.currentDate().addDays(days))

        self.cb_customer.setCurrentIndex(0)
        for f in (self.f_cust_name, self.f_cust_biz, self.f_cust_abn, self.f_cust_email):
            f.clear()
        self.f_cust_addr.clear()
        self.f_notes.clear()

        # Clear line items
        for r in self._line_rows:
            self._rows_layout.removeWidget(r)
            r.deleteLater()
        self._line_rows.clear()
        self._add_line_item()
        self._recalculate()

    def _collect_form_data(self):
        """Return (invoice_dict, items_list) or None if validation fails."""
        # Validate line items
        items = []
        for r in self._line_rows:
            v = r.get_values()
            if not v['description'] and v['unit_price'] == 0:
                continue
            if not v['description']:
                QMessageBox.warning(self, "Validation", "Each line item must have a description.")
                return None
            items.append(v)

        if not items:
            QMessageBox.warning(self, "Validation", "Please add at least one line item.")
            return None

        cust_name = self.f_cust_name.text().strip()
        if not cust_name and not self.f_cust_biz.text().strip():
            QMessageBox.warning(self, "Validation", "Please enter a customer name or select a customer.")
            return None

        subtotal = sum(i['quantity'] * i['unit_price'] for i in items)
        gst      = subtotal * 0.10
        total    = subtotal + gst
        doc_type = 'invoice' if self.cb_type.currentIndex() == 0 else 'quote'

        inv = {
            'invoice_number': self.f_number.text().strip(),
            'type':           doc_type,
            'customer_id':    self.cb_customer.currentData(),
            'customer_name':  self.f_cust_name.text().strip(),
            'customer_biz':   self.f_cust_biz.text().strip(),
            'customer_addr':  self.f_cust_addr.toPlainText().strip(),
            'customer_email': self.f_cust_email.text().strip(),
            'customer_abn':   self.f_cust_abn.text().strip(),
            'date':           self.f_date.date().toString("dd/MM/yyyy"),
            'due_date':       self.f_due_date.date().toString("dd/MM/yyyy") if doc_type == 'invoice' else '',
            'notes':          self.f_notes.toPlainText().strip(),
            'subtotal':       subtotal,
            'gst':            gst,
            'total':          total,
        }
        if not inv['invoice_number']:
            QMessageBox.warning(self, "Validation", "Invoice number cannot be empty.")
            return None

        return inv, items

    def _customer_dict(self):
        return {
            'name':          self.f_cust_name.text().strip(),
            'business_name': self.f_cust_biz.text().strip(),
            'abn':           self.f_cust_abn.text().strip(),
            'email':         self.f_cust_email.text().strip(),
            'address':       self.f_cust_addr.toPlainText().strip(),
        }

    # ── Actions ─────────────────────────────────────────────────────────

    def _save(self):
        result = self._collect_form_data()
        if result is None:
            return
        inv, items = result

        if self._current_invoice_id is not None:
            QMessageBox.information(self, "Already Saved",
                                    f"{inv['invoice_number']} has already been saved.\n"
                                    "To create a new document, click 'Clear Form'.")
            return

        if self.db.invoice_number_exists(inv['invoice_number']):
            QMessageBox.warning(self, "Duplicate Number",
                                f"Invoice number {inv['invoice_number']} already exists.\n"
                                "Please change the reference number.")
            return

        self._current_invoice_id = self.db.save_invoice(inv, items)
        doc_label = "Invoice" if inv['type'] == 'invoice' else "Quote"
        QMessageBox.information(self, "Saved",
                                f"{doc_label} {inv['invoice_number']} saved successfully.")
        self.invoice_saved.emit()
        self.btn_save.setEnabled(False)

    def _generate_pdf(self):
        result = self._collect_form_data()
        if result is None:
            return
        inv, items = result

        # Save to DB first if not yet saved
        if self._current_invoice_id is None:
            if self.db.invoice_number_exists(inv['invoice_number']):
                QMessageBox.warning(self, "Duplicate Number",
                                    f"Invoice number {inv['invoice_number']} already exists.\n"
                                    "Please change the reference number.")
                return
            self._current_invoice_id = self.db.save_invoice(inv, items)
            self.invoice_saved.emit()
            self.btn_save.setEnabled(False)

        default_name = f"{inv['invoice_number'].replace('/', '-')}.pdf"
        path, _ = QFileDialog.getSaveFileName(
            self, "Save PDF As",
            os.path.join(os.path.expanduser("~"), "Documents", default_name),
            "PDF Files (*.pdf)"
        )
        if not path:
            return

        settings = self.db.get_all_settings()
        generator = InvoicePDF(settings)
        try:
            generator.generate(inv, self._customer_dict(), items, path)
        except Exception as e:
            QMessageBox.critical(self, "PDF Error", f"Failed to generate PDF:\n{e}")
            return

        reply = QMessageBox.information(
            self, "PDF Generated",
            f"PDF saved to:\n{path}\n\nOpen the file now?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            import subprocess, sys
            if sys.platform == 'win32':
                os.startfile(path)
            elif sys.platform == 'darwin':
                subprocess.Popen(['open', path])
            else:
                subprocess.Popen(['xdg-open', path])
