export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) return "Use 3–24 characters.";
  if (!USERNAME_PATTERN.test(username)) return "Use lowercase letters, numbers, or underscores only.";
  return "";
}

export function displayUsername(value?: string) {
  return value ? `@${normalizeUsername(value)}` : "Username not set";
}