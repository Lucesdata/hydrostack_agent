/**
 * Route handler: /api/auth/* (Auth.js v5, App Router).
 * Toda la config vive en src/lib/auth/config.ts; este archivo solo re-exporta
 * los handlers GET/POST que Auth.js genera para signin/signout/callback/csrf.
 */

import { handlers } from '@/src/lib/auth/config';

export const { GET, POST } = handlers;
