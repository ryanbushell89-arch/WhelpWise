# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for WhelpWise Invoicing
#
# Build command (run from the desktop-app directory):
#   pyinstaller WhelpWise.spec
#
# Output:  dist/WhelpWise.exe

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Bundle the empty assets placeholder — at runtime the user's logo
        # is stored BESIDE the .exe, not inside the bundle.
        ('assets', 'assets'),
    ],
    hiddenimports=[
        # PyQt6 components sometimes missed by the hook
        'PyQt6.QtCore',
        'PyQt6.QtGui',
        'PyQt6.QtWidgets',
        'PyQt6.QtPrintSupport',
        'PyQt6.sip',
        # ReportLab sub-packages
        'reportlab.graphics',
        'reportlab.graphics.charts',
        'reportlab.graphics.shapes',
        'reportlab.pdfbase',
        'reportlab.pdfbase.ttfonts',
        'reportlab.pdfbase.pdfmetrics',
        'reportlab.pdfgen',
        'reportlab.platypus',
        'reportlab.lib',
        'reportlab.lib.colors',
        'reportlab.lib.enums',
        'reportlab.lib.pagesizes',
        'reportlab.lib.styles',
        'reportlab.lib.units',
        # Pillow (used by ReportLab for image handling)
        'PIL',
        'PIL.Image',
        'PIL.ImageFile',
        'PIL.JpegImagePlugin',
        'PIL.PngImagePlugin',
        # Application modules
        'database',
        'pdf_generator',
        'ui',
        'ui.main_window',
        'ui.customer_tab',
        'ui.invoice_tab',
        'ui.settings_tab',
        'ui.history_tab',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Trim unused large packages to reduce .exe size
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'tkinter',
        'unittest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='WhelpWise',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,                     # compress with UPX if available (reduces size)
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,                # no console window (GUI application)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    # icon='assets/icon.ico',     # uncomment and supply a .ico file for a custom icon
)
