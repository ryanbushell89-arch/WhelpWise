import os
import tempfile
import subprocess
import sys

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QLabel, QComboBox, QLineEdit, QMessageBox, QFileDialog,
    QHeaderView,
)
from PyQt6.QtCore import Qt

from pdf_generator import InvoicePDF


class HistoryTab(QWidget):
    def __init__(self, db, base_dir):
        super().__init__()
        self.db       = db
        self.base_dir = base_dir
        self._build_ui()
        self.refresh()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(10)

        # Toolbar
        bar = QHBoxLayout()

        self.search = QLineEdit()
        self.search.setPlaceholderText("Search by number or customer…")
        self.search.setMaximumWidth(280)
        self.search.textChanged.connect(self._filter)

        self.cb_filter = QComboBox()
        self.cb_filter.addItems(["All Documents", "Invoices Only", "Quotes Only"])
        self.cb_filter.setFixedWidth(160)
        self.cb_filter.currentIndexChanged.connect(self._filter)

        btn_refresh = QPushButton("Refresh")
        btn_refresh.setObjectName("btnSecondary")
        btn_refresh.setFixedWidth(90)
        btn_refresh.clicked.connect(self.refresh)

        bar.addWidget(QLabel("Invoice History"))
        bar.addStretch()
        bar.addWidget(self.search)
        bar.addWidget(self.cb_filter)
        bar.addWidget(btn_refresh)
        layout.addLayout(bar)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(8)
        self.table.setHorizontalHeaderLabels([
            "Number", "Type", "Customer", "Date", "Due Date",
            "Total (incl. GST)", "Status", "Actions",
        ])
        self.table.setAlternatingRowColors(True)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QTableWidget.SelectionMode.SingleSelection)
        self.table.verticalHeader().setVisible(False)
        self.table.setShowGrid(False)

        hh = self.table.horizontalHeader()
        hh.setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        hh.setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(5, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(6, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(7, QHeaderView.ResizeMode.ResizeToContents)

        layout.addWidget(self.table)

        # Summary bar
        self.lbl_summary = QLabel("")
        self.lbl_summary.setObjectName("labelMuted")
        layout.addWidget(self.lbl_summary)

    def refresh(self):
        self._all_rows = list(self.db.get_invoices())
        self._filter()

    def _filter(self, *_):
        idx = self.cb_filter.currentIndex()
        type_filter = {0: None, 1: 'invoice', 2: 'quote'}.get(idx)
        q = self.search.text().lower().strip()

        filtered = []
        for row in self._all_rows:
            if type_filter and row['type'] != type_filter:
                continue
            num     = (row['invoice_number'] or '').lower()
            cust    = (row['customer_name'] or row['cust_name'] or '').lower()
            cust_bz = (row['customer_biz']  or row['cust_biz']  or '').lower()
            if q and q not in num and q not in cust and q not in cust_bz:
                continue
            filtered.append(row)

        self._populate(filtered)

    def _populate(self, rows):
        self.table.setRowCount(0)

        for ri, r in enumerate(rows):
            self.table.insertRow(ri)

            # Display customer name: prefer snapshotted name, fall back to joined
            cust_biz  = (r['customer_biz']  or r['cust_biz']  or '').strip()
            cust_name = (r['customer_name'] or r['cust_name'] or '').strip()
            customer  = cust_biz or cust_name or '—'

            doc_type  = 'Tax Invoice' if r['type'] == 'invoice' else 'Quote'
            total_str = f"${float(r['total']):,.2f}"

            cells = [
                r['invoice_number'] or '',
                doc_type,
                customer,
                r['date']     or '',
                r['due_date'] or '—',
                total_str,
                (r['status'] or 'issued').capitalize(),
            ]
            for col, text in enumerate(cells):
                item = QTableWidgetItem(text)
                item.setData(Qt.ItemDataRole.UserRole, r['id'])
                if col == 5:
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                self.table.setItem(ri, col, item)

            # Actions cell
            cell = QWidget()
            cl   = QHBoxLayout(cell)
            cl.setContentsMargins(4, 2, 4, 2)
            cl.setSpacing(4)

            btn_pdf = QPushButton("PDF")
            btn_pdf.setObjectName("btnSmall")
            btn_pdf.setFixedWidth(44)
            btn_pdf.setToolTip("Generate / re-export PDF")
            btn_pdf.clicked.connect(lambda _, rid=r['id']: self._export_pdf(rid))

            btn_del = QPushButton("Delete")
            btn_del.setObjectName("btnDanger")
            btn_del.setFixedWidth(60)
            btn_del.setStyleSheet("font-size:11px; padding:3px 8px; min-height:22px;")
            btn_del.clicked.connect(lambda _, rid=r['id']: self._delete(rid))

            cl.addWidget(btn_pdf)
            cl.addWidget(btn_del)
            self.table.setCellWidget(ri, 7, cell)

        self.table.resizeRowsToContents()

        total_amount = sum(float(r['total']) for r in rows)
        self.lbl_summary.setText(
            f"{len(rows)} document(s)  |  Total value: ${total_amount:,.2f} (incl. GST)"
        )

    def _export_pdf(self, invoice_id):
        inv, items = self.db.get_invoice(invoice_id)
        if not inv:
            return

        # Build customer dict from snapshotted fields
        customer = {
            'name':          inv['customer_name'] or '',
            'business_name': inv['customer_biz']  or '',
            'address':       inv['customer_addr'] or '',
            'email':         inv['customer_email'] or '',
            'abn':           inv['customer_abn']  or '',
        }
        # Fall back to live customer record if available
        if inv['customer_id']:
            c = self.db.get_customer(inv['customer_id'])
            if c:
                for k in ('name', 'business_name', 'address', 'email', 'abn'):
                    if not customer.get(k):
                        customer[k] = c[k] or ''

        inv_data = {
            'invoice_number': inv['invoice_number'],
            'type':           inv['type'],
            'date':           inv['date']     or '',
            'due_date':       inv['due_date'] or '',
            'notes':          inv['notes']    or '',
            'subtotal':       inv['subtotal'],
            'gst':            inv['gst'],
            'total':          inv['total'],
        }

        items_list = [
            {'description': i['description'], 'quantity': i['quantity'], 'unit_price': i['unit_price']}
            for i in items
        ]

        default_name = f"{inv['invoice_number'].replace('/', '-')}.pdf"
        path, _ = QFileDialog.getSaveFileName(
            self, "Save PDF As",
            os.path.join(os.path.expanduser("~"), "Documents", default_name),
            "PDF Files (*.pdf)"
        )
        if not path:
            return

        settings = self.db.get_all_settings()
        gen = InvoicePDF(settings)
        try:
            gen.generate(inv_data, customer, items_list, path)
        except Exception as e:
            QMessageBox.critical(self, "PDF Error", f"Failed to generate PDF:\n{e}")
            return

        reply = QMessageBox.information(
            self, "PDF Saved", f"Saved to:\n{path}\n\nOpen now?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            if sys.platform == 'win32':
                os.startfile(path)
            elif sys.platform == 'darwin':
                subprocess.Popen(['open', path])
            else:
                subprocess.Popen(['xdg-open', path])

    def _delete(self, invoice_id):
        inv, _ = self.db.get_invoice(invoice_id)
        if not inv:
            return
        reply = QMessageBox.question(
            self, "Confirm Delete",
            f"Permanently delete <b>{inv['invoice_number']}</b>?<br>"
            "This cannot be undone.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            self.db.delete_invoice(invoice_id)
            self.refresh()
