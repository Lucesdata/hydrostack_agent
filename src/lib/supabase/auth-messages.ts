const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed:
    "Debes verificar tu correo antes de ingresar — revisa tu bandeja de entrada.",
  email_exists: "Ese correo ya está registrado. Intenta iniciar sesión.",
  weak_password: "La contraseña debe tener al menos 8 caracteres.",
  oauth_error: "No pudimos conectar con Google. Intenta de nuevo.",
  signup_error: "No pudimos crear la cuenta. Intenta de nuevo.",
};

const NOTICE_MESSAGES: Record<string, string> = {
  check_email: "Cuenta creada — revisa tu correo para verificarla antes de ingresar.",
};

export function authErrorMessage(code?: string): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? "Ocurrió un error. Intenta de nuevo.";
}

export function authNoticeMessage(code?: string): string | null {
  if (!code) return null;
  return NOTICE_MESSAGES[code] ?? null;
}
