import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Image fields are strings (URL paths) rather than Astro `image()` assets
 * so seed content can reference brand SVGs in /public/img/ without forcing
 * everything through the image pipeline. When real product photos exist in
 * src/assets/products/, swap to image() and use <Image> for optimization.
 */

const colecciones = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/colecciones' }),
  schema: z.object({
    nombre: z.string(),
    descripcion: z.string(),
    hero: z.string().optional(),
    orden: z.number().default(0),
    destacada: z.boolean().default(false),
  }),
});

const productos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/productos' }),
  schema: z.object({
    nombre: z.string(),
    precio: z.number().positive(),
    descripcionCorta: z.string(),
    imagenes: z.array(z.string()).min(1),
    colecciones: z.array(z.string()).min(1),
    disponible: z.boolean().default(true),
    orden: z.number().default(0),
    sku: z.string().optional(),
  }),
});

export const collections = { colecciones, productos };
