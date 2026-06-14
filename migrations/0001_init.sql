CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  estado TEXT NOT NULL DEFAULT 'nuevo'
    CHECK (estado IN ('nuevo','confirmado','preparando','enviado','entregado','cancelado')),
  nota TEXT,
  tracking TEXT,
  total REAL NOT NULL,
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_estado ON orders(estado);

CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  nombre TEXT NOT NULL,
  precio REAL NOT NULL,
  qty INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  estado TEXT NOT NULL,
  at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_status_history_order_at ON order_status_history(order_id, at);
