CREATE TABLE IF NOT EXISTS collections (
  slug TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  descripcion_md TEXT,
  hero TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  destacada INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collections_orden ON collections(orden);

CREATE TABLE IF NOT EXISTS products (
  slug TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio REAL NOT NULL CHECK (precio >= 0),
  descripcion_corta TEXT NOT NULL,
  descripcion_md TEXT,
  disponible INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_disponible_orden ON products(disponible, orden);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  url TEXT NOT NULL,
  blob_key TEXT,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_images_producto_orden
  ON product_images(producto_slug, orden);

CREATE TABLE IF NOT EXISTS product_collections (
  producto_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  coleccion_slug TEXT NOT NULL REFERENCES collections(slug) ON DELETE CASCADE,
  PRIMARY KEY (producto_slug, coleccion_slug)
);

CREATE INDEX IF NOT EXISTS idx_product_collections_coleccion
  ON product_collections(coleccion_slug);
