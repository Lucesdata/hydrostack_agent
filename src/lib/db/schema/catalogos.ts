import { pgTable, uuid, text, boolean, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/** Geografía DANE. PK natural DIVIPOLA (D7). */
export const geografia = pgTable('geografia', {
  codigoDivipola: text('codigo_divipola').primaryKey(), // 5 dígitos: 2 depto + 3 mun
  departamentoCodigo: text('departamento_codigo'),
  departamentoNombre: text('departamento_nombre'),
  municipioCodigo: text('municipio_codigo'),
  municipioNombre: text('municipio_nombre'),
});

/**
 * Puente texto → DIVIPOLA (D12). La fuente da nombres ("Bogotá D.C."), no códigos.
 * texto_normalizado: minúsculas sin tildes, resuelto contra el crosswalk DANE.
 */
export const geografiaAlias = pgTable(
  'geografia_alias',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    textoNormalizado: text('texto_normalizado').notNull(),
    codigoDivipola: text('codigo_divipola')
      .notNull()
      .references(() => geografia.codigoDivipola),
  },
  (t) => [uniqueIndex('geografia_alias_texto_uq').on(t.textoNormalizado)],
);

/**
 * Proveedor. PK UUID interno; NIT canónico UNIQUE (D2).
 * D22: la fuente NO trae DV — `nit_dv` lo calculamos con DIAN; `nit_valid_dv`
 * se eliminó (no hay DV declarado contra el cual validar).
 */
export const proveedor = pgTable(
  'proveedor',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nitCanonico: text('nit_canonico').notNull(), // sin DV, sin formato, solo dígitos (D5)
    nitDv: text('nit_dv'), // DV calculado por nosotros (DIAN); la fuente no lo trae (D22)
    tipoDocumento: text('tipo_documento'), // NIT | CC | CE | PASAPORTE | OTRO
    razonSocial: text('razon_social'),
    esEstructuraPlural: boolean('es_estructura_plural').default(false).notNull(), // consorcio / UT
    rawAttrs: jsonb('raw_attrs'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('proveedor_nit_uq').on(t.nitCanonico)],
);

/**
 * Entidad estatal compradora. PK UUID interno; NIT canónico UNIQUE (D2).
 * D23: `sector` se renombró a `sector_administrativo` (es el sector PGN, NO el
 * sector agua/saneamiento — esa pertenencia vive en clasificacion_sectorial).
 * `rama` se removió de columna y vive en raw_attrs.rama (informativo).
 * D24: nivel_gobierno conserva el dominio real de la fuente
 * (territorial/nacional/corporacion_autonoma/otro).
 */
export const entidad = pgTable(
  'entidad',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nitCanonico: text('nit_canonico').notNull(),
    nitDv: text('nit_dv'), // DV calculado (D22)
    nombre: text('nombre'),
    nivelGobierno: text('nivel_gobierno'), // territorial | nacional | corporacion_autonoma | otro (D24)
    sectorAdministrativo: text('sector_administrativo'), // sector PGN de la fuente (D23)
    geografiaId: text('geografia_id').references(() => geografia.codigoDivipola),
    rawAttrs: jsonb('raw_attrs'), // incluye rama (D23) y otros atributos no normalizados
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('entidad_nit_uq').on(t.nitCanonico)],
);
