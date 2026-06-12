from PyQt6.QtWidgets import QMainWindow, QTabWidget, QStatusBar
from PyQt6.QtCore import Qt

APP_STYLE = """
QMainWindow, QDialog {
    background-color: #f0f2f5;
}
QTabWidget::pane {
    border: 1px solid #ced4da;
    background-color: #ffffff;
    border-radius: 0 4px 4px 4px;
}
QTabBar::tab {
    background-color: #dee2e6;
    color: #495057;
    padding: 9px 18px;
    border: 1px solid #ced4da;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    margin-right: 2px;
    font-size: 13px;
}
QTabBar::tab:selected {
    background-color: #2C3E50;
    color: #ffffff;
    font-weight: bold;
}
QTabBar::tab:hover:!selected {
    background-color: #adb5bd;
}
QPushButton {
    background-color: #3498DB;
    color: white;
    border: none;
    padding: 7px 16px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    min-height: 28px;
}
QPushButton:hover  { background-color: #2980B9; }
QPushButton:pressed { background-color: #1a6fa3; }
QPushButton:disabled { background-color: #adb5bd; color: #6c757d; }
QPushButton#btnDanger {
    background-color: #E74C3C;
}
QPushButton#btnDanger:hover  { background-color: #c0392b; }
QPushButton#btnSuccess {
    background-color: #27AE60;
}
QPushButton#btnSuccess:hover { background-color: #219150; }
QPushButton#btnSecondary {
    background-color: #6c757d;
}
QPushButton#btnSecondary:hover { background-color: #545b62; }
QPushButton#btnSmall {
    padding: 3px 8px;
    font-size: 11px;
    min-height: 22px;
}
QPushButton#btnRemove {
    background-color: #e9ecef;
    color: #495057;
    border: 1px solid #ced4da;
    padding: 2px 7px;
    font-size: 12px;
    font-weight: bold;
    min-height: 22px;
    border-radius: 3px;
}
QPushButton#btnRemove:hover { background-color: #E74C3C; color: white; border-color: #c0392b; }
QLineEdit, QTextEdit, QComboBox, QDateEdit, QDoubleSpinBox, QSpinBox {
    border: 1px solid #ced4da;
    border-radius: 4px;
    padding: 5px 8px;
    background-color: #ffffff;
    font-size: 12px;
    color: #212529;
}
QLineEdit:focus, QTextEdit:focus, QComboBox:focus,
QDateEdit:focus, QDoubleSpinBox:focus, QSpinBox:focus {
    border-color: #3498DB;
    outline: none;
}
QLineEdit:read-only { background-color: #f8f9fa; color: #6c757d; }
QTableWidget {
    gridline-color: #dee2e6;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background-color: #ffffff;
    alternate-background-color: #f8f9fa;
    font-size: 12px;
    selection-background-color: #cfe2ff;
    selection-color: #000000;
}
QTableWidget::item { padding: 4px 6px; }
QHeaderView::section {
    background-color: #2C3E50;
    color: #ffffff;
    padding: 7px 8px;
    border: none;
    font-weight: bold;
    font-size: 12px;
}
QGroupBox {
    font-weight: bold;
    font-size: 12px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin-top: 14px;
    padding: 12px 10px 10px 10px;
    background-color: #ffffff;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 10px;
    padding: 0 6px;
    color: #2C3E50;
    background-color: #ffffff;
}
QLabel { color: #2C3E50; font-size: 12px; }
QLabel#labelMuted { color: #6c757d; font-size: 11px; }
QScrollArea { border: none; background-color: transparent; }
QStatusBar { background-color: #2C3E50; color: #adb5bd; font-size: 11px; }
QMessageBox { background-color: #ffffff; }
QSplitter::handle { background-color: #dee2e6; }
"""


class MainWindow(QMainWindow):
    def __init__(self, db, base_dir):
        super().__init__()
        self.db = db
        self.base_dir = base_dir

        self.setWindowTitle("Invoicing Lite")
        self.setMinimumSize(1100, 750)
        self.resize(1200, 820)
        self.setStyleSheet(APP_STYLE)

        # Import here to avoid circular issues at module load
        from ui.customer_tab import CustomerTab
        from ui.invoice_tab import InvoiceTab
        from ui.settings_tab import SettingsTab
        from ui.history_tab import HistoryTab

        tabs = QTabWidget()
        tabs.setDocumentMode(False)

        self.invoice_tab  = InvoiceTab(db, base_dir)
        self.customer_tab = CustomerTab(db)
        self.history_tab  = HistoryTab(db, base_dir)
        self.settings_tab = SettingsTab(db, base_dir)

        tabs.addTab(self.invoice_tab,  "  New Invoice / Quote  ")
        tabs.addTab(self.customer_tab, "  Customers  ")
        tabs.addTab(self.history_tab,  "  Invoice History  ")
        tabs.addTab(self.settings_tab, "  Settings  ")

        # Refresh invoice customer list when customers change
        self.customer_tab.customers_changed.connect(self.invoice_tab.refresh_customers)
        # Refresh history when a new invoice is saved
        self.invoice_tab.invoice_saved.connect(self.history_tab.refresh)

        self.setCentralWidget(tabs)

        status = QStatusBar()
        self.setStatusBar(status)
        status.showMessage("Invoicing Lite  –  Ready")
