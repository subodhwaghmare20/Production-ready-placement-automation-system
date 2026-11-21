import { IMessagingProvider, PersonalizationVariables } from './messagingProvider.interface';
import { WhatsAppConfig } from '../models/WhatsAppConfig.model';

export class WhatsAppCloudApiProvider implements IMessagingProvider {
  getProviderName(): string {
    return 'CLOUD_API';
  }

  async isConfigured(): Promise<boolean> {
    const config = await WhatsAppConfig.findOne();
    if (!config || !config.cloudApi || !config.cloudApi.isEnabled) {
      return false;
    }
    const { phoneNumberId, accessToken, wabaId } = config.cloudApi;
    return Boolean(phoneNumberId && accessToken && wabaId);
  }

  personalizeMessage(templateText: string, variables: PersonalizationVariables): string {
    if (!templateText) return '';
    return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
      const val = variables[key];
      return val !== undefined && val !== null ? val.trim() : '';
    });
  }

  generateClickToChatUrl(normalizedPhoneNumber: string, messageText: string): string {
    // Cloud API sends server-to-server messages; fallback click-to-chat for admin preview
    const cleanPhone = normalizedPhoneNumber.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
  }

  /**
   * Stub for sending template message via Meta Graph API in future modules.
   */
  async sendMessage(_recipientPhone: string, _templateName: string, _parameters: string[]): Promise<never> {
    throw new Error(
      'WhatsApp Business Cloud API is currently in preparation mode. The administrator currently uses Personal WhatsApp assisted mode. Cloud API dispatch will be activated in a future release once Meta verification is finalized.'
    );
  }
}

export const whatsAppCloudApiProvider = new WhatsAppCloudApiProvider();

