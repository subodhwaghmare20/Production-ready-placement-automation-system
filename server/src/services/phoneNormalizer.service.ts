import { normalizePhoneNumber, PhoneNormalizationResult } from '../utils/phoneNormalizer';

export interface ExtractedPhoneItem {
  raw: string;
  normalized: string;
  isValid: boolean;
  error?: string;
  isDuplicateInInput: boolean;
}

export interface PasteExtractionResult {
  totalExtracted: number;
  uniqueValidCount: number;
  invalidCount: number;
  duplicateCount: number;
  items: ExtractedPhoneItem[];
  uniqueNormalizedNumbers: string[];
}

/**
 * Parses raw text input containing multiple phone numbers separated by
 * newlines, commas, semicolons, tabs, or spaces.
 */
export function extractAndNormalizeNumbers(rawInput: string): PasteExtractionResult {
  if (!rawInput || !rawInput.trim()) {
    return {
      totalExtracted: 0,
      uniqueValidCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      items: [],
      uniqueNormalizedNumbers: [],
    };
  }

  // Split on newlines, commas, semicolons, tabs, or sequences of whitespace
  // Replace carriage returns
  const sanitized = rawInput.replace(/\r/g, '\n');
  const tokens = sanitized
    .split(/[\n,;\t]+/)
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);

  const items: ExtractedPhoneItem[] = [];
  const seenNormalized = new Set<string>();
  const uniqueNormalizedList: string[] = [];
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const token of tokens) {
    // Check if the entire token is already a valid phone number (e.g. "+91 98765 43211")
    const wholeNorm = normalizePhoneNumber(token);
    if (wholeNorm.isValid) {
      const isDupe = seenNormalized.has(wholeNorm.normalized);
      if (isDupe) {
        items.push({
          raw: token,
          normalized: wholeNorm.normalized,
          isValid: true,
          isDuplicateInInput: true,
        });
        duplicateCount++;
      } else {
        seenNormalized.add(wholeNorm.normalized);
        uniqueNormalizedList.push(wholeNorm.normalized);
        items.push({
          raw: token,
          normalized: wholeNorm.normalized,
          isValid: true,
          isDuplicateInInput: false,
        });
      }
      continue;
    }

    // Otherwise, check if token contains multiple space-separated numbers
    const subTokens = token.split(/\s+/).filter(Boolean);
    if (subTokens.length > 1) {
      for (const sub of subTokens) {
        const normRes = normalizePhoneNumber(sub);
        if (!normRes.isValid) {
          items.push({
            raw: sub,
            normalized: '',
            isValid: false,
            error: normRes.error || 'Invalid phone number format',
            isDuplicateInInput: false,
          });
          invalidCount++;
        } else {
          const isDupe = seenNormalized.has(normRes.normalized);
          if (isDupe) {
            items.push({
              raw: sub,
              normalized: normRes.normalized,
              isValid: true,
              isDuplicateInInput: true,
            });
            duplicateCount++;
          } else {
            seenNormalized.add(normRes.normalized);
            uniqueNormalizedList.push(normRes.normalized);
            items.push({
              raw: sub,
              normalized: normRes.normalized,
              isValid: true,
              isDuplicateInInput: false,
            });
          }
        }
      }
    } else {
      // Single invalid token
      items.push({
        raw: token,
        normalized: '',
        isValid: false,
        error: wholeNorm.error || 'Invalid phone number format',
        isDuplicateInInput: false,
      });
      invalidCount++;
    }
  }

  return {
    totalExtracted: items.length,
    uniqueValidCount: uniqueNormalizedList.length,
    invalidCount,
    duplicateCount,
    items,
    uniqueNormalizedNumbers: uniqueNormalizedList,
  };
}

export { normalizePhoneNumber };
