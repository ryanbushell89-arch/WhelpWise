# WhelpWise Invoicing — Build & Run Instructions

## Project structure

```
desktop-app/
├── main.py               # Entry point
├── database.py           # SQLite schema & all CRUD helpers
├── pdf_generator.py      # ReportLab ATO-compliant PDF engine
├── ui/
│   ├── __init__.py
│   ├── main_window.py    # QMainWindow + global stylesheet
│   ├── customer_tab.py   # Customer add/edit/delete
│   ├── invoice_tab.py    # Invoice & quote creation form
│   ├── settings_tab.py   # Company settings & logo upload
│   └── history_tab.py    # Invoice history & PDF re-export
├── assets/               # Uploaded logo stored here at runtime
├── requirements.txt
├── WhelpWise.spec        # PyInstaller build spec
└── BUILD_INSTRUCTIONS.md
```

---

## 1 — Run from source (development)

### Prerequisites
- Python 3.11 or 3.12 (64-bit, Windows/macOS/Linux)
- pip

### Setup

```cmd
cd desktop-app
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # macOS / Linux

pip install -r requirements.txt
python main.py
```

The app writes `whelpwise.db` and `assets/` beside `main.py`.

---

## 2 — Compile to a standalone Windows .exe

All steps below are run in a **Windows** Command Prompt or PowerShell
inside the `desktop-app` directory.

### 2.1 — Install dependencies (first time)

```cmd
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2.2 — Build the executable

```cmd
pyinstaller WhelpWise.spec
```

PyInstaller places the finished file at:

```
desktop-app\dist\WhelpWise.exe
```

> **Tip — optional UPX compression**
> Download UPX from https://upx.github.io and place `upx.exe` somewhere on
> your PATH. PyInstaller will use it automatically to shrink the `.exe`
> by ~30–40 %.

### 2.3 — Distribute

Copy **only** `dist\WhelpWise.exe` to any Windows 10/11 computer.
No Python installation is required on the target machine.

When the user runs `WhelpWise.exe` for the first time, the app creates:

```
(same folder as the .exe)
├── WhelpWise.exe
├── whelpwise.db       ← created automatically
└── assets/            ← created automatically (logo stored here)
```

> The `.exe` and its companion data must stay in the same folder.
> The `.exe` can be placed on the Desktop, in `C:\Program Files`, or
> anywhere the user has write access to that folder.

---

## 3 — Optional: add a Windows application icon

1. Prepare a 256×256 (or multi-size) `.ico` file and save it as
   `desktop-app\assets\icon.ico`.
2. Open `WhelpWise.spec` and uncomment the `icon=` line:
   ```python
   icon='assets/icon.ico',
   ```
3. Re-run `pyinstaller WhelpWise.spec`.

---

## 4 — ATO compliance notes

Generated PDFs meet Australian Tax Office requirements for a valid tax invoice:

| Requirement | Where shown |
|---|---|
| Words "Tax Invoice" | Top-right, prominent |
| Seller identity (business name) | Header |
| Seller ABN | Header |
| Date of issue | Invoice details panel |
| Description of supply | Line items table |
| GST amount payable | Totals — "GST (10%)" row |
| Total price including GST | Totals — "TOTAL (incl. GST)" row |

---

## 5 — Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: PyQt6` | Run `pip install PyQt6` inside the venv |
| `ModuleNotFoundError: reportlab` | Run `pip install reportlab` |
| PDF won't open after generation | Ensure a PDF viewer is installed (Adobe Reader, Edge, etc.) |
| Logo not appearing on PDF | Go to **Settings** tab → re-upload the logo, then save |
| `.exe` crashes on launch | Rebuild with `console=True` in the spec to see the error message |
| Duplicate invoice numbers | Change the reference number field manually before saving |
