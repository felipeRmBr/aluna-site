CREATE TABLE IF NOT EXISTS product_verticals (
  slug TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_verticals_orden ON product_verticals(orden, nombre);

CREATE TABLE IF NOT EXISTS vertical_colors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vertical_slug TEXT NOT NULL REFERENCES product_verticals(slug) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  hex TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vertical_colors_vertical_orden
  ON vertical_colors(vertical_slug, orden, nombre);

ALTER TABLE products ADD COLUMN vertical_slug TEXT REFERENCES product_verticals(slug);

CREATE INDEX IF NOT EXISTS idx_products_vertical
  ON products(vertical_slug);

CREATE TABLE IF NOT EXISTS product_color_combinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_color_combinations_producto_orden
  ON product_color_combinations(producto_slug, orden, id);

CREATE TABLE IF NOT EXISTS product_color_combination_colors (
  combinacion_id INTEGER NOT NULL REFERENCES product_color_combinations(id) ON DELETE CASCADE,
  color_id INTEGER NOT NULL REFERENCES vertical_colors(id) ON DELETE RESTRICT,
  orden INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (combinacion_id, color_id, orden)
);

CREATE INDEX IF NOT EXISTS idx_product_color_combination_colors_combinacion
  ON product_color_combination_colors(combinacion_id, orden);

ALTER TABLE order_items ADD COLUMN color_combination_id INTEGER;
ALTER TABLE order_items ADD COLUMN color_combination_nombre TEXT;
