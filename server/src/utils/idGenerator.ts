import crypto from 'crypto';

/**
 * Generates an institutional candidate identifier: e.g. CAN-2026-94812
 */
export function generateCandidateId(year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const randomNum = crypto.randomInt(10000, 99999);
  return `CAN-${currentYear}-${randomNum}`;
}

/**
 * Generates an institutional company identifier: e.g. COMP-2026-81923
 */
export function generateCompanyId(year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const randomNum = crypto.randomInt(10000, 99999);
  return `COMP-${currentYear}-${randomNum}`;
}

/**
 * Generates an institutional virtual group identifier: e.g. GRP-2026-49120
 */
export function generateGroupId(year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const randomNum = crypto.randomInt(10000, 99999);
  return `GRP-${currentYear}-${randomNum}`;
}

/**
 * Generates a contact fetch operation identifier: e.g. FETCH-2026-19283
 */
export function generateFetchOperationId(year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const randomNum = crypto.randomInt(10000, 99999);
  return `FETCH-${currentYear}-${randomNum}`;
}

/**
 * Generates a WhatsApp campaign identifier: e.g. CAMP-2026-58192
 */
export function generateCampaignId(year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const randomNum = crypto.randomInt(10000, 99999);
  return `CAMP-${currentYear}-${randomNum}`;
}

/**
 * Generates a message template identifier: e.g. TMPL-2026-38194
 */
export function generateTemplateId(year?: number): string {
  const currentYear = year || new Date().getFullYear();
  const randomNum = crypto.randomInt(10000, 99999);
  return `TMPL-${currentYear}-${randomNum}`;
}
