/**
 * Utility for masking phone numbers to protect student/candidate privacy
 * Format example: +91 98*** ***10 or 98*** ***10
 */
export function maskPhoneNumber(phoneNumber: string | undefined | null): string {
  if (!phoneNumber) return '';
  const clean = phoneNumber.trim();
  if (clean.length <= 4) {
    return '••••';
  }

  // Check if international prefix exists (e.g., +91 or +1)
  if (clean.startsWith('+')) {
    const parts = clean.split(' ');
    if (parts.length > 1) {
      const code = parts[0];
      const rest = parts.slice(1).join('');
      if (rest.length <= 4) return `${code} ••••`;
      const first2 = rest.substring(0, 2);
      const last2 = rest.substring(rest.length - 2);
      return `${code} ${first2}*** ***${last2}`;
    } else {
      const code = clean.substring(0, 3); // +91
      const rest = clean.substring(3);
      if (rest.length <= 4) return `${code} ••••`;
      const first2 = rest.substring(0, 2);
      const last2 = rest.substring(rest.length - 2);
      return `${code} ${first2}*** ***${last2}`;
    }
  }

  // Local 10 digit number
  if (clean.length >= 10) {
    const first2 = clean.substring(0, 2);
    const last2 = clean.substring(clean.length - 2);
    return `${first2}*** ***${last2}`;
  }

  // Fallback mask middle
  const start = clean.substring(0, 2);
  const end = clean.substring(clean.length - 2);
  return `${start}••••${end}`;
}
