"""
WhelpWise Invoicing — entry point.

Run directly:   python main.py
Frozen (.exe):  Works automatically via PyInstaller.
"""
import sys
import os


def _base_dir():
    """User-writable directory beside the executable (or the script folder)."""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def main():
    base = _base_dir()
    os.makedirs(os.path.join(base, 'assets'), exist_ok=True)

    # Add the app root to sys.path so imports work when frozen
    if base not in sys.path:
        sys.path.insert(0, base)

    from PyQt6.QtWidgets import QApplication
    from PyQt6.QtCore import Qt
    from PyQt6.QtGui import QFont

    from database import Database
    from ui.main_window import MainWindow

    app = QApplication(sys.argv)
    app.setApplicationName("WhelpWise Invoicing")
    app.setOrganizationName("WhelpWise")

    # Crisp rendering on high-DPI displays
    app.setAttribute(Qt.ApplicationAttribute.AA_UseHighDpiPixmaps, True)

    default_font = QFont("Segoe UI", 10)
    app.setFont(default_font)

    db = Database(base)
    db.initialize()

    window = MainWindow(db, base)
    window.show()

    sys.exit(app.exec())


if __name__ == '__main__':
    main()
