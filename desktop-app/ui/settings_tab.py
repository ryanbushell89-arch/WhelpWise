import os
import shutil

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QFormLayout, QGroupBox,
    QPushButton, QLabel, QLineEdit, QTextEdit, QSpinBox,
    QFileDialog, QMessageBox, QScrollArea,
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QPixmap


class SettingsTab(QWidget):
    def __init__(self, db, base_dir):
        super().__init__()
        self.db       = db
        self.base_dir = base_dir
        self._build_ui()
        self._load()

    def _build_ui(self):
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        container = QWidget()
        main = QVBoxLayout(container)
        main.setContentsMargins(20, 16, 20, 20)
        main.setSpacing(14)

        main.addWidget(self._build_company_group())
        main.addWidget(self._build_logo_group())
        main.addWidget(self._build_banking_group())
        main.addWidget(self._build_defaults_group())

        # Save button
        row = QHBoxLayout()
        row.addStretch()
        btn_save = QPushButton("Save Settings")
        btn_save.setObjectName("btnSuccess")
        btn_save.setFixedWidth(160)
        btn_save.clicked.connect(self._save)
        row.addWidget(btn_save)
        main.addLayout(row)

        scroll.setWidget(container)
        outer.addWidget(scroll)

    def _build_company_group(self):
        grp = QGroupBox("Company Details  (printed on all invoices)")
        form = QFormLayout(grp)
        form.setSpacing(8)
        form.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self.f_company_name  = QLineEdit(); self.f_company_name.setPlaceholderText("Your Company Pty Ltd")
        self.f_abn           = QLineEdit(); self.f_abn.setPlaceholderText("12 345 678 901")
        self.f_email         = QLineEdit(); self.f_email.setPlaceholderText("accounts@yourcompany.com.au")
        self.f_phone         = QLineEdit(); self.f_phone.setPlaceholderText("+61 2 xxxx xxxx")
        self.f_address       = QTextEdit()
        self.f_address.setPlaceholderText("123 Business St\nSydney  NSW  2000")
        self.f_address.setMaximumHeight(72)

        form.addRow("Company Name *", self.f_company_name)
        form.addRow("ABN *",          self.f_abn)
        form.addRow("Email",          self.f_email)
        form.addRow("Phone",          self.f_phone)
        form.addRow("Address",        self.f_address)
        return grp

    def _build_logo_group(self):
        grp = QGroupBox("Company Logo")
        layout = QHBoxLayout(grp)
        layout.setSpacing(16)

        left = QVBoxLayout()
        left.setSpacing(6)

        self.logo_preview = QLabel("No logo uploaded")
        self.logo_preview.setFixedSize(180, 80)
        self.logo_preview.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.logo_preview.setStyleSheet(
            "border: 1px dashed #ced4da; border-radius: 4px; background: #f8f9fa; color: #6c757d; font-size: 11px;"
        )

        btn_upload = QPushButton("Upload Logo…")
        btn_upload.setObjectName("btnSecondary")
        btn_upload.setFixedWidth(140)
        btn_upload.clicked.connect(self._upload_logo)

        btn_clear = QPushButton("Remove Logo")
        btn_clear.setObjectName("btnDanger")
        btn_clear.setFixedWidth(140)
        btn_clear.clicked.connect(self._clear_logo)

        left.addWidget(self.logo_preview)
        left.addWidget(btn_upload)
        left.addWidget(btn_clear)
        left.addStretch()

        right = QVBoxLayout()
        right.setSpacing(4)
        info = QLabel(
            "Supported formats: PNG, JPG, JPEG\n"
            "Recommended size: 400 × 150 px or similar landscape ratio.\n"
            "The logo will be displayed in the top-left of every PDF."
        )
        info.setObjectName("labelMuted")
        info.setWordWrap(True)
        right.addWidget(info)
        right.addStretch()

        layout.addLayout(left,  0)
        layout.addLayout(right, 1)
        return grp

    def _build_banking_group(self):
        grp = QGroupBox("Bank / Payment Details  (shown on invoices)")
        form = QFormLayout(grp)
        form.setSpacing(8)
        form.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self.f_bank_name    = QLineEdit(); self.f_bank_name.setPlaceholderText("Commonwealth Bank")
        self.f_bank_acct_nm = QLineEdit(); self.f_bank_acct_nm.setPlaceholderText("Your Company Pty Ltd")
        self.f_bsb          = QLineEdit(); self.f_bsb.setPlaceholderText("062-000")
        self.f_account      = QLineEdit(); self.f_account.setPlaceholderText("1234 5678")

        form.addRow("Bank Name",      self.f_bank_name)
        form.addRow("Account Name",   self.f_bank_acct_nm)
        form.addRow("BSB",            self.f_bsb)
        form.addRow("Account Number", self.f_account)
        return grp

    def _build_defaults_group(self):
        grp = QGroupBox("Invoice Defaults")
        form = QFormLayout(grp)
        form.setSpacing(8)
        form.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self.f_payment_terms = QSpinBox()
        self.f_payment_terms.setRange(1, 365)
        self.f_payment_terms.setValue(30)
        self.f_payment_terms.setSuffix(" days")
        self.f_payment_terms.setFixedWidth(110)

        form.addRow("Default Payment Terms:", self.f_payment_terms)
        return grp

    # ── Logic ───────────────────────────────────────────────────────────

    def _load(self):
        s = self.db.get_all_settings()
        self.f_company_name.setText(s.get('company_name', ''))
        self.f_abn.setText(s.get('company_abn', ''))
        self.f_email.setText(s.get('company_email', ''))
        self.f_phone.setText(s.get('company_phone', ''))
        self.f_address.setPlainText(s.get('company_address', ''))
        self.f_bank_name.setText(s.get('bank_name', ''))
        self.f_bank_acct_nm.setText(s.get('bank_account_name', ''))
        self.f_bsb.setText(s.get('bank_bsb', ''))
        self.f_account.setText(s.get('bank_account', ''))
        try:
            self.f_payment_terms.setValue(int(s.get('payment_terms', '30')))
        except ValueError:
            pass
        logo = s.get('company_logo', '')
        if logo and os.path.exists(logo):
            self._show_logo(logo)

    def _save(self):
        company = self.f_company_name.text().strip()
        abn     = self.f_abn.text().strip()
        if not company:
            QMessageBox.warning(self, "Required", "Company Name is required.")
            self.f_company_name.setFocus()
            return

        mapping = {
            'company_name':    company,
            'company_abn':     abn,
            'company_email':   self.f_email.text().strip(),
            'company_phone':   self.f_phone.text().strip(),
            'company_address': self.f_address.toPlainText().strip(),
            'bank_name':       self.f_bank_name.text().strip(),
            'bank_account_name': self.f_bank_acct_nm.text().strip(),
            'bank_bsb':        self.f_bsb.text().strip(),
            'bank_account':    self.f_account.text().strip(),
            'payment_terms':   str(self.f_payment_terms.value()),
        }
        for key, value in mapping.items():
            self.db.set_setting(key, value)

        QMessageBox.information(self, "Saved", "Settings saved successfully.")

    def _upload_logo(self):
        path, _ = QFileDialog.getOpenFileName(
            self, "Select Logo Image",
            os.path.expanduser("~"),
            "Images (*.png *.jpg *.jpeg)"
        )
        if not path:
            return
        assets_dir = os.path.join(self.base_dir, 'assets')
        os.makedirs(assets_dir, exist_ok=True)
        ext  = os.path.splitext(path)[1].lower()
        dest = os.path.join(assets_dir, f'logo{ext}')
        try:
            shutil.copy2(path, dest)
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Could not copy logo:\n{e}")
            return
        self.db.set_setting('company_logo', dest)
        self._show_logo(dest)
        QMessageBox.information(self, "Logo Uploaded", "Logo saved and will appear on future PDFs.")

    def _clear_logo(self):
        self.db.set_setting('company_logo', '')
        self.logo_preview.setPixmap(QPixmap())
        self.logo_preview.setText("No logo uploaded")

    def _show_logo(self, path):
        pix = QPixmap(path)
        if not pix.isNull():
            pix = pix.scaled(
                180, 80,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation
            )
            self.logo_preview.setPixmap(pix)
            self.logo_preview.setText('')
