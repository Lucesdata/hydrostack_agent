/**
 * Carga .env.local ANTES de cualquier import que lea process.env (el cliente DB
 * construye el Pool con DATABASE_URL al ser importado). Por eso este módulo se
 * importa primero, como side-effect, en los scripts que tocan la base:
 *
 *   import './_env';
 *   import { ... } from '@/src/lib/db/client';
 *
 * Los imports ES se evalúan en orden de aparición, así que dotenv corre antes de
 * que el cliente lea la variable.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
