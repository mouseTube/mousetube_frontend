// The rules of a password, the same for the registration form and for the change of password. Only an
// instant feedback: the API applies the real rules (the validators of Django) in both cases.
export const passwordHint = 'At least 8 characters, not only digits, not a common password.';
export const passwordLengthRule = (v?: string) =>
  (v || '').length >= 8 || 'Use at least 8 characters';
export const passwordDigitsRule = (v?: string) =>
  !/^\d+$/.test(v || '') || 'Do not use digits only';
