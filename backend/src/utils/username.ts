export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export function normalizeUsername(username: string): string {
  return username.toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function internalEmailForUsername(username: string): string {
  return `${username}@users.nebulens.local`;
}
