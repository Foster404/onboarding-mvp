export const PASSWORD_REQUIREMENTS_TEXT =
  "At least 6 characters, including 1 uppercase letter and 1 digit.";

export function isPasswordValid(password: string): boolean {
  return password.length >= 6 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}
