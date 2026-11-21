export interface PhoneNormalizationResult {
  isValid: boolean;
  normalized: string;
  original: string;
  error?: string;
}

/**
 * Normalizes phone numbers with intelligent Indian format handling and international E.164 support.
 * Examples:
 *  - "9876543210" -> "+919876543210"
 *  - "09876543210" -> "+919876543210"
 *  - "+91 98765-43210" -> "+919876543210"
 *  - "919876543210" -> "+919876543210"
 *  - "+1 (415) 555-2671" -> "+14155552671"
 *  - "0044 7911 123456" -> "+447911123456"
 */
export function normalizePhoneNumber(rawPhone: string | undefined | null): PhoneNormalizationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      normalized: '',
      original: rawPhone || '',
      error: 'Phone number is required',
    };
  }

  const original = rawPhone.trim();
  // Remove spaces, hyphens, brackets, dots
  let cleaned = original.replace(/[\s\-\(\)\.]/g, '');

  // Handle international '00' prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Case 1: Starts with '+' (International or Indian with country code)
  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.slice(1);
    if (!/^\d+$/.test(digitsOnly)) {
      return {
        isValid: false,
        normalized: '',
        original,
        error: 'Phone number contains invalid non-numeric characters',
      };
    }

    if (cleaned.startsWith('+91')) {
      const nationalPart = cleaned.slice(3);
      if (nationalPart.length !== 10) {
        return {
          isValid: false,
          normalized: '',
          original,
          error: 'Indian phone number must contain exactly 10 digits after +91',
        };
      }
      if (!/^[6-9]/.test(nationalPart)) {
        return {
          isValid: false,
          normalized: '',
          original,
          error: 'Indian mobile numbers must begin with 6, 7, 8, or 9',
        };
      }
      return { isValid: true, normalized: cleaned, original };
    }

    // General international E.164: 7 to 15 digits
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return {
        isValid: false,
        normalized: '',
        original,
        error: 'International phone numbers must contain between 7 and 15 digits',
      };
    }

    return { isValid: true, normalized: cleaned, original };
  }

  // Case 2: Indian number with leading 0 (e.g. 09876543210)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    const nationalPart = cleaned.slice(1);
    if (/^[6-9]\d{9}$/.test(nationalPart)) {
      return { isValid: true, normalized: `+91${nationalPart}`, original };
    }
  }

  // Case 3: Indian number starting with 91 without plus (e.g. 919876543210)
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    const nationalPart = cleaned.slice(2);
    if (/^[6-9]\d{9}$/.test(nationalPart)) {
      return { isValid: true, normalized: `+91${nationalPart}`, original };
    }
  }

  // Case 4: Standard 10-digit Indian number (e.g. 9876543210)
  if (cleaned.length === 10) {
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return { isValid: true, normalized: `+91${cleaned}`, original };
    }
    return {
      isValid: false,
      normalized: '',
      original,
      error: '10-digit Indian mobile number must begin with 6, 7, 8, or 9',
    };
  }

  return {
    isValid: false,
    normalized: '',
    original,
    error: 'Invalid phone format. Please enter a 10-digit mobile number or full international number with +country code',
  };
}

/**
 * Validates optional email format
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email || email.trim() === '') return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

