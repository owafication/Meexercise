export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function readText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export function isValidEmail(email: string): boolean {
  return (
    email.length > 3 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (password.length > 256) {
    return "Password is too long.";
  }

  return null;
}
