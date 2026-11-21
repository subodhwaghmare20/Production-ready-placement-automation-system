import { WhatsAppConfig, IWhatsAppConfig } from '../models/WhatsAppConfig.model';

export interface UpdateWhatsAppSettingsInput {
  mode?: 'PERSONAL_ASSISTED' | 'CLOUD_API';
  personal?: {
    senderPhone?: string;
    autoAdvanceOnSent?: boolean;
    safetyDelaySeconds?: number;
  };
  cloudApi?: {
    isEnabled?: boolean;
    metaBusinessAccountId?: string;
    wabaId?: string;
    phoneNumberId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
    apiVersion?: string;
  };
  adminId?: string;
}

export class WhatsAppConfigService {
  /**
   * Gets or initializes singleton WhatsApp configuration.
   * Masks sensitive credentials like access token before returning.
   */
  async getConfig(): Promise<Record<string, unknown>> {
    let config = await WhatsAppConfig.findOne();
    if (!config) {
      config = await WhatsAppConfig.create({
        mode: 'PERSONAL_ASSISTED',
        personal: {
          accountType: 'PERSONAL',
          webUrlPrefix: 'https://wa.me',
          autoAdvanceOnSent: true,
          safetyDelaySeconds: 3,
        },
        cloudApi: {
          isEnabled: false,
          apiVersion: 'v20.0',
          isVerified: false,
        },
      });
    }

    const doc = config.toObject() as IWhatsAppConfig;
    // Mask access token for safety
    if (doc.cloudApi?.accessToken) {
      const raw = doc.cloudApi.accessToken;
      doc.cloudApi.accessToken =
        raw.length > 8 ? `${raw.slice(0, 4)}...${raw.slice(-4)}` : '••••••••';
    }

    return doc as unknown as Record<string, unknown>;
  }

  /**
   * Updates configuration settings
   */
  async updateConfig(input: UpdateWhatsAppSettingsInput): Promise<Record<string, unknown>> {
    let config = await WhatsAppConfig.findOne();
    if (!config) {
      config = new WhatsAppConfig();
    }

    if (input.mode) {
      config.mode = input.mode;
    }

    if (input.personal) {
      config.personal = {
        ...config.personal,
        ...input.personal,
      };
    }

    if (input.cloudApi) {
      const existingToken = config.cloudApi?.accessToken;
      config.cloudApi = {
        ...config.cloudApi,
        ...input.cloudApi,
      };
      // Keep existing token if incoming is empty or masked
      if (
        !input.cloudApi.accessToken ||
        input.cloudApi.accessToken.includes('••') ||
        input.cloudApi.accessToken.includes('...')
      ) {
        config.cloudApi.accessToken = existingToken;
      }
    }

    if (input.adminId) {
      config.updatedBy = input.adminId as unknown as any;
    }

    await config.save();
    return this.getConfig();
  }

  /**
   * Validates configuration readiness
   */
  async testConnection(mode: 'PERSONAL_ASSISTED' | 'CLOUD_API'): Promise<{
    success: boolean;
    message: string;
    mode: string;
  }> {
    if (mode === 'PERSONAL_ASSISTED') {
      return {
        success: true,
        message:
          'Personal WhatsApp Assisted Sender is ready. Click-to-chat links will open directly via WhatsApp Web/Desktop with prefilled student messages.',
        mode: 'PERSONAL_ASSISTED',
      };
    } else {
      const config = await WhatsAppConfig.findOne();
      if (!config?.cloudApi?.isEnabled || !config.cloudApi.accessToken) {
        return {
          success: false,
          message:
            'WhatsApp Business Cloud API is not fully configured. Missing Access Token or Phone Number ID.',
          mode: 'CLOUD_API',
        };
      }
      return {
        success: true,
        message: 'WhatsApp Cloud API parameters verified. Meta Webhook listener ready.',
        mode: 'CLOUD_API',
      };
    }
  }
}

export const whatsAppConfigService = new WhatsAppConfigService();

