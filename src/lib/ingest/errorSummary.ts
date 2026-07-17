/**
 * Resume un error de ingesta para guardar en `sync_log.error_summary`.
 *
 * Drizzle envuelve los fallos de query en `DrizzleQueryError`, cuyo `.message`
 * es "Failed query: <sql>\nparams: <...>" — con inserts en batch eso es un
 * dump enorme que se come el `.slice(0, maxLen)` antes de llegar al motivo
 * real. El motivo real vive en `.cause` (el error nativo de Postgres, con
 * `.code`/`.detail`/`.hint`). Priorizamos esos campos.
 */

interface PgLikeError {
  message: string;
  code?: unknown;
  detail?: unknown;
  hint?: unknown;
}

function asPgLikeError(value: unknown): PgLikeError | null {
  return value instanceof Error ? (value as unknown as PgLikeError) : null;
}

export function summarizeIngestError(err: unknown, maxLen = 500): string {
  const top = err instanceof Error ? err : new Error(String(err));
  const cause = 'cause' in top ? (top as { cause?: unknown }).cause : undefined;
  const source = asPgLikeError(cause) ?? (top as unknown as PgLikeError);

  const code = typeof source.code === 'string' ? source.code : null;
  const detail = typeof source.detail === 'string' ? source.detail : null;
  const hint = typeof source.hint === 'string' ? source.hint : null;

  let summary = code ? `[${code}] ${source.message}` : source.message;
  if (detail) summary += ` — detail: ${detail}`;
  if (hint) summary += ` — hint: ${hint}`;

  return summary.length > maxLen ? `${summary.slice(0, maxLen - 1)}…` : summary;
}
