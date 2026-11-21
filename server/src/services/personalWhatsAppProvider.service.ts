import { IMessagingProvider, PersonalizationVariables } from './messagingProvider.interface';

export class PersonalWhatsAppProvider implements IMessagingProvider {
  getProviderName(): string {
    return 'PERSONAL_ASSISTED';
  }

  async isConfigured(): Promise<boolean> {
    // Personal WhatsApp mode is always ready because it leverages WhatsApp Web
    return true;
  }

  /**
   * Cleans a phone number for wa.me format.
   * wa.me requires international format without +, 00, spaces, or hyphens.
   * e.g. "+91 98765-43210" -> "919876543210"
   */
  cleanPhoneForWaMe(phone: string): string {
    if (!phone) return '';
    // Strip everything except digits
    return phone.replace(/\D/g, '');
  }

  /**
   * Replaces merge tags like {{candidateName}} with actual values.
   */
  personalizeMessage(templateText: string, variables: PersonalizationVariables): string {
    if (!templateText) return '';

    return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      const val = variables[key];
      if (val !== undefined && val !== null && val.trim() !== '') {
        return val.trim();
      }
      // If variable is not provided, return clean fallback or keep placeholder
      return '';
    });
  }

  /**
   * Generates official WhatsApp click-to-chat URL:
   * https://wa.me/<number>?text=<encoded_text>
   */
  generateClickToChatUrl(normalizedPhoneNumber: string, messageText: string): string {
    const cleanPhone = this.cleanPhoneForWaMe(normalizedPhoneNumber);
    const encodedText = encodeURIComponent(messageText);
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
}

export const personalWhatsAppProvider = new PersonalWhatsAppProvider();

