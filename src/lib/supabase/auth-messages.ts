/**
 * Vocabulario único de errores de auth: del mensaje crudo de GoTrue al código
 * estable que viaja en la URL, y de ahí al texto que ve el usuario. Las tres
 * piezas viven juntas a propósito — cuando el mapeo estaba disperso en
 * `actions.ts` con `if (message.includes(...))` sueltos, un fallo real quedó
 * meses cayendo en el cajón genérico "Intenta de nuevo".
 */

/**
 * Mensajes crudos de GoTrue, del más específico al más general. Se comparan
 * como subcadena sin distinguir mayúsculas porque Supabase los reformula entre
 * versiones y a veces llegan envueltos en el nombre del error.
 */
const CODIGO_POR_MENSAJE: ReadonlyArray<readonly [RegExp, string]> = [
  // El servicio de correo integrado de Supabase solo entrega a direcciones del
  // equipo del proyecto; con cualquier otra responde esto. La cuenta queda
  // creada igual, así que NO es un error que se arregle reintentando.
  [/email address not authorized/i, "email_delivery_failed"],
  [/error sending/i, "email_delivery_failed"],
  [/rate limit/i, "rate_limit"],
  // GoTrue limita los envíos de correo por usuario (60 s por defecto) y lo dice
  // así, sin la expresión "rate limit": «For security purposes, you can only
  // request this after 57 seconds» (`over_email_send_rate_limit`). Caía al
  // genérico «No pudimos crear la cuenta» aunque el primer envío sí la creó.
  [/you can only request this after/i, "rate_limit"],
  [/over_email_send_rate_limit/i, "rate_limit"],
  [/already registered/i, "email_exists"],
  [/email not confirmed/i, "email_not_confirmed"],
  [/invalid login credentials/i, "invalid_credentials"],
  [/password should be at least/i, "weak_password"],
];

/**
 * Traduce el mensaje de Supabase a un código de la app. `fallback` es el código
 * que corresponde al flujo que llama (`signup_error` en el alta,
 * `invalid_credentials` en el ingreso) para los mensajes que no reconocemos.
 */
export function authErrorCode(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  for (const [patron, codigo] of CODIGO_POR_MENSAJE) {
    if (patron.test(raw)) return codigo;
  }
  return fallback;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed:
    "Debes verificar tu correo antes de ingresar — revisa tu bandeja de entrada.",
  email_exists: "Ese correo ya está registrado. Intenta iniciar sesión.",
  weak_password: "La contraseña debe tener al menos 8 caracteres.",
  oauth_error: "No pudimos conectar con Google. Intenta de nuevo.",
  rate_limit:
    "Espera un minuto antes de volver a intentarlo. Si ya te registraste, tu cuenta existe: revisa tu correo y la carpeta de spam.",
  // Sin "intenta de nuevo": el alta ya quedó registrada y reintentar solo
  // devuelve "ese correo ya está registrado". Lo que falla es nuestro envío.
  email_delivery_failed:
    "No pudimos enviarte el correo de verificación — es una falla de nuestro servidor de correo, no tuya. Tu cuenta quedó creada: entra con Google o escríbenos para activarla.",
  signup_error: "No pudimos crear la cuenta. Intenta de nuevo.",
};

const NOTICE_MESSAGES: Record<string, string> = {
  check_email: "Cuenta creada — revisa tu correo para verificarla antes de ingresar.",
  confirmation_resent:
    "Te reenviamos el correo de verificación — revisa tu bandeja de entrada y la carpeta de spam.",
};

export function authErrorMessage(code?: string): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Ocurrió un error. Intenta de nuevo.";
}

export function authNoticeMessage(code?: string): string | null {
  if (!code) return null;
  return NOTICE_MESSAGES[code] ?? null;
}
