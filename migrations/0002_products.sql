CREATE TABLE IF NOT EXISTS colecciones (
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

CREATE INDEX IF NOT EXISTS idx_colecciones_orden ON colecciones(orden);

CREATE TABLE IF NOT EXISTS productos (
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

CREATE INDEX IF NOT EXISTS idx_productos_disponible_orden ON productos(disponible, orden);

CREATE TABLE IF NOT EXISTS producto_imagenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_slug TEXT NOT NULL REFERENCES productos(slug) ON DELETE CASCADE,
  url TEXT NOT NULL,
  blob_key TEXT,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_producto_imagenes_producto_orden
  ON producto_imagenes(producto_slug, orden);

CREATE TABLE IF NOT EXISTS producto_colecciones (
  producto_slug TEXT NOT NULL REFERENCES productos(slug) ON DELETE CASCADE,
  coleccion_slug TEXT NOT NULL REFERENCES colecciones(slug) ON DELETE CASCADE,
  PRIMARY KEY (producto_slug, coleccion_slug)
);

CREATE INDEX IF NOT EXISTS idx_producto_colecciones_coleccion
  ON producto_colecciones(coleccion_slug);
