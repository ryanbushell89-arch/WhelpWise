import sqlite3
import os
from datetime import datetime, date


class Database:
    def __init__(self, base_dir):
        self.db_path = os.path.join(base_dir, 'invoicing_lite.db')
        self._conn = None

    def _get_conn(self):
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path)
            self._conn.row_factory = sqlite3.Row
            self._conn.execute("PRAGMA foreign_keys = ON")
        return self._conn

    def initialize(self):
        conn = self._get_conn()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS customers (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                name          TEXT NOT NULL,
                business_name TEXT,
                address       TEXT,
                email         TEXT,
                abn           TEXT,
                phone         TEXT,
                created_at    TEXT DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT UNIQUE NOT NULL,
                type           TEXT NOT NULL DEFAULT 'invoice',
                customer_id    INTEGER,
                customer_name  TEXT,
                customer_biz   TEXT,
                customer_addr  TEXT,
                customer_email TEXT,
                customer_abn   TEXT,
                date           TEXT NOT NULL,
                due_date       TEXT,
                notes          TEXT,
                status         TEXT DEFAULT 'issued',
                subtotal       REAL DEFAULT 0,
                gst            REAL DEFAULT 0,
                total          REAL DEFAULT 0,
                created_at     TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS invoice_items (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id  INTEGER NOT NULL,
                description TEXT NOT NULL,
                quantity    REAL NOT NULL DEFAULT 1,
                unit_price  REAL NOT NULL DEFAULT 0,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
            );
        """)

        defaults = [
            ('company_name', ''),
            ('company_abn', ''),
            ('company_address', ''),
            ('company_email', ''),
            ('company_phone', ''),
            ('company_logo', ''),
            ('invoice_counter', '1'),
            ('quote_counter', '1'),
            ('payment_terms', '30'),
            ('bank_name', ''),
            ('bank_bsb', ''),
            ('bank_account', ''),
            ('bank_account_name', ''),
        ]
        for key, value in defaults:
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
                (key, value)
            )
        conn.commit()

    # ──────────────────────────── Customers ────────────────────────────

    def get_customers(self):
        return self._get_conn().execute(
            "SELECT * FROM customers ORDER BY name COLLATE NOCASE"
        ).fetchall()

    def get_customer(self, customer_id):
        return self._get_conn().execute(
            "SELECT * FROM customers WHERE id = ?", (customer_id,)
        ).fetchone()

    def add_customer(self, name, business_name, address, email, abn, phone):
        conn = self._get_conn()
        cur = conn.execute(
            """INSERT INTO customers (name, business_name, address, email, abn, phone)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name, business_name, address, email, abn, phone)
        )
        conn.commit()
        return cur.lastrowid

    def update_customer(self, customer_id, name, business_name, address, email, abn, phone):
        conn = self._get_conn()
        conn.execute(
            """UPDATE customers
               SET name=?, business_name=?, address=?, email=?, abn=?, phone=?
               WHERE id=?""",
            (name, business_name, address, email, abn, phone, customer_id)
        )
        conn.commit()

    def delete_customer(self, customer_id):
        conn = self._get_conn()
        conn.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
        conn.commit()

    # ──────────────────────────── Settings ─────────────────────────────

    def get_setting(self, key, default=''):
        row = self._get_conn().execute(
            "SELECT value FROM settings WHERE key = ?", (key,)
        ).fetchone()
        return row['value'] if row else default

    def set_setting(self, key, value):
        conn = self._get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, value)
        )
        conn.commit()

    def get_all_settings(self):
        rows = self._get_conn().execute("SELECT key, value FROM settings").fetchall()
        return {r['key']: r['value'] for r in rows}

    # ──────────────────────────── Invoices ─────────────────────────────

    def next_invoice_number(self, doc_type='invoice'):
        if doc_type == 'invoice':
            n = int(self.get_setting('invoice_counter', '1'))
            self.set_setting('invoice_counter', str(n + 1))
            return f"INV-{date.today().strftime('%Y')}-{n:04d}"
        else:
            n = int(self.get_setting('quote_counter', '1'))
            self.set_setting('quote_counter', str(n + 1))
            return f"QUO-{date.today().strftime('%Y')}-{n:04d}"

    def save_invoice(self, inv, items):
        conn = self._get_conn()
        cur = conn.execute(
            """INSERT INTO invoices
               (invoice_number, type, customer_id, customer_name, customer_biz,
                customer_addr, customer_email, customer_abn,
                date, due_date, notes, status, subtotal, gst, total)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                inv['invoice_number'], inv['type'],
                inv.get('customer_id'), inv.get('customer_name', ''),
                inv.get('customer_biz', ''), inv.get('customer_addr', ''),
                inv.get('customer_email', ''), inv.get('customer_abn', ''),
                inv['date'], inv.get('due_date', ''),
                inv.get('notes', ''), inv.get('status', 'issued'),
                inv['subtotal'], inv['gst'], inv['total']
            )
        )
        invoice_id = cur.lastrowid
        for item in items:
            conn.execute(
                """INSERT INTO invoice_items (invoice_id, description, quantity, unit_price)
                   VALUES (?,?,?,?)""",
                (invoice_id, item['description'], item['quantity'], item['unit_price'])
            )
        conn.commit()
        return invoice_id

    def get_invoices(self, doc_type=None):
        query = """
            SELECT i.*, c.name AS cust_name, c.business_name AS cust_biz
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
        """
        if doc_type:
            query += " WHERE i.type = ?"
            rows = self._get_conn().execute(query + " ORDER BY i.created_at DESC", (doc_type,)).fetchall()
        else:
            rows = self._get_conn().execute(query + " ORDER BY i.created_at DESC").fetchall()
        return rows

    def get_invoice(self, invoice_id):
        conn = self._get_conn()
        inv = conn.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
        items = conn.execute(
            "SELECT * FROM invoice_items WHERE invoice_id = ?", (invoice_id,)
        ).fetchall()
        return inv, items

    def delete_invoice(self, invoice_id):
        conn = self._get_conn()
        conn.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
        conn.commit()

    def invoice_number_exists(self, number):
        row = self._get_conn().execute(
            "SELECT 1 FROM invoices WHERE invoice_number = ?", (number,)
        ).fetchone()
        return row is not None
