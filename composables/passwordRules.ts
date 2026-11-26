// The rules of a password, the same for the registration form and for the change of password. Only an
// instant feedback: the API applies the real rules (the validators of Django) in both cases.
export const passwordHint = 'At least 8 characters, not only digits, not a common password.';
export const passwordLengthRule = (v?: string) =>
  (v || '').length >= 8 || 'Use at least 8 characters';
export const passwordDigitsRule = (v?: string) =>
  !/^\d+$/.test(v || '') || 'Do not use digits only';

// Rough guide of the strength, from 0 to 5 (length, capitals, digits, other characters). Only a
// feedback: the API applies the real rules.
export const passwordScore = (password: string): number =>
  [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

// What the bar shows for a score: its label and its color
export const passwordStrength = (score: number): { label: string; color: string } =>
  [
    { label: '', color: 'grey-lighten-2' },
    { label: 'Weak', color: 'error' },
    { label: 'Weak', color: 'error' },
    { label: 'Fair', color: 'warning' },
    { label: 'Good', color: 'success' },
    { label: 'Strong', color: 'success' },
  ][score];
