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

/** Proveedor. PK UUID interno; NIT canónico UNIQUE (D2). */
export const proveedor = pgTable(
  'proveedor',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nitCanonico: text('nit_canonico').notNull(), // sin DV, sin formato, solo dígitos (D5)
    nitDv: text('nit_dv'),
    nitValidDv: boolean('nit_valid_dv'), // DV declarado coincide con el calculado (DIAN)
    tipoDocumento: text('tipo_documento'), // NIT | CC | CE | PAS | OTRO
    razonSocial: text('razon_social'),
    esEstructuraPlural: boolean('es_estructura_plural').default(false).notNull(), // consorcio / UT
    rawAttrs: jsonb('raw_attrs'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('proveedor_nit_uq').on(t.nitCanonico)],
);

/** Entidad estatal compradora. PK UUID interno; NIT canónico UNIQUE (D2). */
export const entidad = pgTable(
  'entidad',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nitCanonico: text('nit_canonico').notNull(),
    nitDv: text('nit_dv'),
    nombre: text('nombre'),
    nivelGobierno: text('nivel_gobierno'), // Nacional | Territorial
    rama: text('rama'),
    sector: text('sector'),
    geografiaId: text('geografia_id').references(() => geografia.codigoDivipola),
    rawAttrs: jsonb('raw_attrs'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('entidad_nit_uq').on(t.nitCanonico)],
);
