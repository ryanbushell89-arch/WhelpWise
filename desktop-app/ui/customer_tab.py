from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTableWidget, QTableWidgetItem,
    QPushButton, QLineEdit, QLabel, QGroupBox, QFormLayout, QTextEdit,
    QDialog, QDialogButtonBox, QMessageBox, QHeaderView,
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont


class CustomerDialog(QDialog):
    def __init__(self, parent=None, customer=None):
        super().__init__(parent)
        self.setWindowTitle("Add Customer" if customer is None else "Edit Customer")
        self.setMinimumWidth(420)
        self.setModal(True)

        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        form = QFormLayout()
        form.setLabelAlignment(Qt.AlignmentFlag.AlignRight)
        form.setSpacing(8)

        self.f_name   = QLineEdit()
        self.f_biz    = QLineEdit()
        self.f_abn    = QLineEdit()
        self.f_email  = QLineEdit()
        self.f_phone  = QLineEdit()
        self.f_addr   = QTextEdit()
        self.f_addr.setMaximumHeight(80)
        self.f_addr.setPlaceholderText("Street\nCity  State  Postcode")

        for widget, ph in [
            (self.f_name,  "Contact / billing name"),
            (self.f_biz,   "Trading or company name"),
            (self.f_abn,   "e.g. 12 345 678 901"),
            (self.f_email, "billing@example.com"),
            (self.f_phone, "+61 4xx xxx xxx"),
        ]:
            widget.setPlaceholderText(ph)

        form.addRow("Contact Name *", self.f_name)
        form.addRow("Business Name",  self.f_biz)
        form.addRow("ABN",            self.f_abn)
        form.addRow("Email",          self.f_email)
        form.addRow("Phone",          self.f_phone)
        form.addRow("Address",        self.f_addr)

        layout.addLayout(form)

        # Buttons
        btns = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Save | QDialogButtonBox.StandardButton.Cancel
        )
        btns.accepted.connect(self._validate_and_accept)
        btns.rejected.connect(self.reject)
        layout.addWidget(btns)

        if customer:
            self.f_name.setText(customer['name']          or '')
            self.f_biz.setText(customer['business_name']  or '')
            self.f_abn.setText(customer['abn']            or '')
            self.f_email.setText(customer['email']        or '')
            self.f_phone.setText(customer['phone']        or '')
            self.f_addr.setPlainText(customer['address']  or '')

    def _validate_and_accept(self):
        if not self.f_name.text().strip():
            QMessageBox.warning(self, "Required", "Contact Name is required.")
            self.f_name.setFocus()
            return
        self.accept()

    def values(self):
        return {
            'name':          self.f_name.text().strip(),
            'business_name': self.f_biz.text().strip(),
            'abn':           self.f_abn.text().strip(),
            'email':         self.f_email.text().strip(),
            'phone':         self.f_phone.text().strip(),
            'address':       self.f_addr.toPlainText().strip(),
        }


class CustomerTab(QWidget):
    customers_changed = pyqtSignal()

    def __init__(self, db):
        super().__init__()
        self.db = db
        self._build_ui()
        self.refresh()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(10)

        # Toolbar
        bar = QHBoxLayout()
        self.search = QLineEdit()
        self.search.setPlaceholderText("Search customers…")
        self.search.setMaximumWidth(300)
        self.search.textChanged.connect(self._filter)

        btn_add = QPushButton("+ Add Customer")
        btn_add.setObjectName("btnSuccess")
        btn_add.clicked.connect(self._add)

        bar.addWidget(QLabel("Customers"))
        bar.addStretch()
        bar.addWidget(self.search)
        bar.addWidget(btn_add)
        layout.addLayout(bar)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels([
            "Contact Name", "Business Name", "ABN", "Email", "Phone", "Actions",
        ])
        self.table.setAlternatingRowColors(True)
        self.table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QTableWidget.SelectionMode.SingleSelection)
        self.table.verticalHeader().setVisible(False)
        self.table.setShowGrid(False)

        hh = self.table.horizontalHeader()
        hh.setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        hh.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        for col in (2, 3, 4, 5):
            hh.setSectionResizeMode(col, QHeaderView.ResizeMode.ResizeToContents)

        layout.addWidget(self.table)

    def refresh(self):
        self._all_customers = list(self.db.get_customers())
        self._filter(self.search.text())

    def _filter(self, text):
        q = text.lower().strip()
        filtered = [
            c for c in self._all_customers
            if not q or q in (c['name'] or '').lower()
               or q in (c['business_name'] or '').lower()
               or q in (c['email'] or '').lower()
        ]
        self._populate(filtered)

    def _populate(self, customers):
        self.table.setRowCount(0)
        for row_idx, c in enumerate(customers):
            self.table.insertRow(row_idx)
            for col, key in enumerate(['name', 'business_name', 'abn', 'email', 'phone']):
                item = QTableWidgetItem(c[key] or '')
                item.setData(Qt.ItemDataRole.UserRole, c['id'])
                self.table.setItem(row_idx, col, item)

            # Action buttons cell
            cell = QWidget()
            cell_layout = QHBoxLayout(cell)
            cell_layout.setContentsMargins(4, 2, 4, 2)
            cell_layout.setSpacing(4)

            btn_edit = QPushButton("Edit")
            btn_edit.setObjectName("btnSmall")
            btn_edit.setFixedWidth(50)
            btn_edit.clicked.connect(lambda _, cid=c['id']: self._edit(cid))

            btn_del = QPushButton("Delete")
            btn_del.setObjectName("btnDanger")
            btn_del.setFixedWidth(60)
            btn_del.setProperty("class", "btnSmall")
            btn_del.setStyleSheet("font-size:11px; padding:3px 8px; min-height:22px;")
            btn_del.clicked.connect(lambda _, cid=c['id']: self._delete(cid))

            cell_layout.addWidget(btn_edit)
            cell_layout.addWidget(btn_del)
            self.table.setCellWidget(row_idx, 5, cell)

        self.table.resizeRowsToContents()

    def _add(self):
        dlg = CustomerDialog(self)
        if dlg.exec() == QDialog.DialogCode.Accepted:
            v = dlg.values()
            self.db.add_customer(
                v['name'], v['business_name'], v['address'],
                v['email'], v['abn'], v['phone']
            )
            self.refresh()
            self.customers_changed.emit()

    def _edit(self, customer_id):
        c = self.db.get_customer(customer_id)
        if not c:
            return
        dlg = CustomerDialog(self, c)
        if dlg.exec() == QDialog.DialogCode.Accepted:
            v = dlg.values()
            self.db.update_customer(
                customer_id, v['name'], v['business_name'], v['address'],
                v['email'], v['abn'], v['phone']
            )
            self.refresh()
            self.customers_changed.emit()

    def _delete(self, customer_id):
        c = self.db.get_customer(customer_id)
        if not c:
            return
        name = c['business_name'] or c['name']
        reply = QMessageBox.question(
            self, "Confirm Delete",
            f"Delete customer <b>{name}</b>?<br>"
            "Existing invoices for this customer will be kept.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            self.db.delete_customer(customer_id)
            self.refresh()
            self.customers_changed.emit()
