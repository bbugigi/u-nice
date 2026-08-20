-- U-NiceNutraCare — Cloudflare D1 Schema
-- Run: wrangler d1 execute unicenutra-db --file=./schema.sql

-- ===== USERS =====
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ===== PRODUCTS =====
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_en TEXT NOT NULL,
    name_sw TEXT NOT NULL DEFAULT '',
    name_fr TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    price INTEGER NOT NULL,
    original_price INTEGER,
    unit_en TEXT NOT NULL DEFAULT '',
    unit_sw TEXT NOT NULL DEFAULT '',
    unit_fr TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    stock INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 4.5,
    review_count INTEGER NOT NULL DEFAULT 0,
    badges TEXT NOT NULL DEFAULT '[]',
    desc_en TEXT NOT NULL DEFAULT '',
    desc_sw TEXT NOT NULL DEFAULT '',
    desc_fr TEXT NOT NULL DEFAULT '',
    benefits_en TEXT NOT NULL DEFAULT '[]',
    benefits_sw TEXT NOT NULL DEFAULT '[]',
    benefits_fr TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- ===== ORDERS =====
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    subtotal INTEGER NOT NULL,
    delivery_fee INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    delivery_location TEXT NOT NULL DEFAULT 'nairobi',
    promo_code TEXT,
    mpesa_receipt TEXT,
    mpesa_checkout_id TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    paid_at TEXT,
    confirmed_at TEXT,
    delivered_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout ON orders(mpesa_checkout_id);

-- ===== REVIEWS =====
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id TEXT,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL DEFAULT '',
    is_verified INTEGER NOT NULL DEFAULT 0,
    is_approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ===== PROMO CODES =====
CREATE TABLE IF NOT EXISTS promos (
    code TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    description TEXT NOT NULL DEFAULT '',
    min_order INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER NOT NULL DEFAULT -1,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ===== NEWSLETTER SUBSCRIBERS =====
CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ===== ANALYTICS (page views, events) =====
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL DEFAULT '{}',
    user_id TEXT,
    session_id TEXT,
    ip_hash TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

-- ===== FLASH SALES =====
CREATE TABLE IF NOT EXISTS flash_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sale_price INTEGER NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(product_id) REFERENCES products(id)
);
