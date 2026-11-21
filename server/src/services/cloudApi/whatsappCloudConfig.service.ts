import { WhatsAppCloudConfig, IWhatsAppCloudConfig, WhatsAppCloudConnectionStatus } from '../../models/WhatsAppCloudConfig.model';
import { env } from '../../config/env';
import { encrypt, decrypt, maskSecret } from '../../utils/crypto';
import { metaGraphApiService } from './metaGraphApi.service';

export interface UpdateCloudConfigInput {
  appId?: string;
  appSecret?: string;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  graphApiVersion?: string;
  isMockMode?: boolean;
  webhookCallbackUrl?: string;
  adminId?: string;
}

export interface MaskedCloudConfig {
  appId: string;
  appSecret: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName?: string;
  qualityRating?: string;
  accessToken: string;
  webhookVerifyToken: string;
  graphApiVersion: string;
  connectionStatus: WhatsAppCloudConnectionStatus;
  isMockMode: boolean;
  lastVerifiedAt?: Date;
  lastError?: string;
  webhookCallbackUrl: string;
  hasStoredCredentials: boolean;
  isEnvConfigured: boolean;
}

export interface DecryptedCloudConfig {
  appId: string;
  appSecret: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  webhookVerifyToken: string;
  graphApiVersion: string;
  connectionStatus: WhatsAppCloudConnectionStatus;
  isMockMode: boolean;
}

export class WhatsAppCloudConfigService {
  /**
   * Returns current config with sensitive credentials masked for UI/client safe consumption
   */
  async getMaskedConfig(): Promise<MaskedCloudConfig> {
    let config = await WhatsAppCloudConfig.findOne();
    const envHasCreds = !!(env.META_ACCESS_TOKEN || env.META_PHONE_NUMBER_ID);

    if (!config) {
      // Default initial record
      const defaultCallback = `${env.WEBHOOK_BASE_URL || 'http://localhost:5000'}/api/webhooks/whatsapp`;
      config = await WhatsAppCloudConfig.create({
        appId: env.META_APP_ID || '',
        encryptedAppSecret: env.META_APP_SECRET ? encrypt(env.META_APP_SECRET) : '',
        wabaId: env.META_WABA_ID || '',
        phoneNumberId: env.META_PHONE_NUMBER_ID || '',
        encryptedAccessToken: env.META_ACCESS_TOKEN ? encrypt(env.META_ACCESS_TOKEN) : '',
        encryptedVerifyToken: encrypt(env.META_WEBHOOK_VERIFY_TOKEN || 'placement_auto_webhook_verify_token_2026'),
        graphApiVersion: env.META_GRAPH_VERSION || 'v21.0',
        connectionStatus: envHasCreds ? 'CONNECTED' : 'TEST_MODE',
        isMockMode: !envHasCreds,
        webhookCallbackUrl: defaultCallback,
      });
    }

    const rawAppSecret = config.encryptedAppSecret ? decrypt(config.encryptedAppSecret) : '';
    const rawAccessToken = config.encryptedAccessToken ? decrypt(config.encryptedAccessToken) : '';
    const rawVerifyToken = config.encryptedVerifyToken ? decrypt(config.encryptedVerifyToken) : '';

    return {
      appId: config.appId || env.META_APP_ID || '',
      appSecret: maskSecret(rawAppSecret || env.META_APP_SECRET),
      wabaId: config.wabaId || env.META_WABA_ID || '',
      phoneNumberId: config.phoneNumberId || env.META_PHONE_NUMBER_ID || '',
      displayPhoneNumber: config.displayPhoneNumber || '',
      verifiedName: config.verifiedName || 'Placement Automation Gateway',
      qualityRating: config.qualityRating || 'GREEN',
      accessToken: maskSecret(rawAccessToken || env.META_ACCESS_TOKEN),
      webhookVerifyToken: rawVerifyToken ? maskSecret(rawVerifyToken, 6) : env.META_WEBHOOK_VERIFY_TOKEN,
      graphApiVersion: config.graphApiVersion || env.META_GRAPH_VERSION || 'v21.0',
      connectionStatus: config.connectionStatus,
      isMockMode: config.isMockMode,
      lastVerifiedAt: config.lastVerifiedAt,
      lastError: config.lastError,
      webhookCallbackUrl: config.webhookCallbackUrl || `${env.WEBHOOK_BASE_URL || 'http://localhost:5000'}/api/webhooks/whatsapp`,
      hasStoredCredentials: !!(config.phoneNumberId && config.encryptedAccessToken),
      isEnvConfigured: envHasCreds,
    };
  }

  /**
   * Returns decrypted credentials strictly for internal backend use (never send to frontend)
   */
  async getDecryptedConfig(): Promise<DecryptedCloudConfig> {
    const config = await WhatsAppCloudConfig.findOne();

    const rawAppSecret = config?.encryptedAppSecret ? decrypt(config.encryptedAppSecret) : env.META_APP_SECRET;
    const rawAccessToken = config?.encryptedAccessToken ? decrypt(config.encryptedAccessToken) : env.META_ACCESS_TOKEN;
    const rawVerifyToken = config?.encryptedVerifyToken ? decrypt(config.encryptedVerifyToken) : env.META_WEBHOOK_VERIFY_TOKEN;

    const isMock = config ? config.isMockMode : true;

    return {
      appId: config?.appId || env.META_APP_ID || '',
      appSecret: rawAppSecret || '',
      wabaId: config?.wabaId || env.META_WABA_ID || '',
      phoneNumberId: config?.phoneNumberId || env.META_PHONE_NUMBER_ID || '',
      displayPhoneNumber: config?.displayPhoneNumber || '',
      accessToken: rawAccessToken || '',
      webhookVerifyToken: rawVerifyToken || 'placement_auto_webhook_verify_token_2026',
      graphApiVersion: config?.graphApiVersion || env.META_GRAPH_VERSION || 'v21.0',
      connectionStatus: config?.connectionStatus || (isMock ? 'TEST_MODE' : 'NOT_CONFIGURED'),
      isMockMode: isMock,
    };
  }

  /**
   * Updates credentials, encrypting secrets at rest with AES-256-GCM
   */
  async updateConfig(input: UpdateCloudConfigInput): Promise<MaskedCloudConfig> {
    let config = await WhatsAppCloudConfig.findOne();
    if (!config) {
      config = new WhatsAppCloudConfig();
    }

    if (input.appId !== undefined) config.appId = input.appId.trim();
    if (input.wabaId !== undefined) config.wabaId = input.wabaId.trim();
    if (input.phoneNumberId !== undefined) config.phoneNumberId = input.phoneNumberId.trim();
    if (input.displayPhoneNumber !== undefined) config.displayPhoneNumber = input.displayPhoneNumber.trim();
    if (input.graphApiVersion !== undefined) config.graphApiVersion = input.graphApiVersion.trim();
    if (input.isMockMode !== undefined) config.isMockMode = input.isMockMode;
    if (input.webhookCallbackUrl !== undefined) config.webhookCallbackUrl = input.webhookCallbackUrl.trim();

    // Encrypt sensitive secrets only if newly provided and not masked
    if (input.appSecret && !input.appSecret.includes('••')) {
      config.encryptedAppSecret = encrypt(input.appSecret.trim());
    }
    if (input.accessToken && !input.accessToken.includes('••')) {
      config.encryptedAccessToken = encrypt(input.accessToken.trim());
    }
    if (input.webhookVerifyToken && !input.webhookVerifyToken.includes('••')) {
      config.encryptedVerifyToken = encrypt(input.webhookVerifyToken.trim());
    }

    if (input.adminId) {
      config.updatedBy = input.adminId as unknown as any;
    }

    await config.save();
    return this.getMaskedConfig();
  }

  /**
   * Tests the Meta Cloud API connection and saves the resulting status
   */
  async testConnection(customCreds?: Partial<UpdateCloudConfigInput>): Promise<any> {
    let config = await WhatsAppCloudConfig.findOne();
    if (!config) {
      config = new WhatsAppCloudConfig();
    }

    const decrypted = await this.getDecryptedConfig();

    const credsToTest = {
      appId: customCreds?.appId || decrypted.appId,
      appSecret: customCreds?.appSecret && !customCreds.appSecret.includes('••')
        ? customCreds.appSecret
        : decrypted.appSecret,
      wabaId: customCreds?.wabaId || decrypted.wabaId,
      phoneNumberId: customCreds?.phoneNumberId || decrypted.phoneNumberId,
      accessToken: customCreds?.accessToken && !customCreds.accessToken.includes('••')
        ? customCreds.accessToken
        : decrypted.accessToken,
      graphApiVersion: customCreds?.graphApiVersion || decrypted.graphApiVersion,
      isMockMode: customCreds?.isMockMode !== undefined ? customCreds.isMockMode : decrypted.isMockMode,
    };

    const result = await metaGraphApiService.testConnection(credsToTest);

    if (result.success) {
      config.connectionStatus = credsToTest.isMockMode ? 'TEST_MODE' : 'CONNECTED';
      config.lastVerifiedAt = new Date();
      config.lastError = undefined;
      if (result.details?.verifiedName) config.verifiedName = result.details.verifiedName;
      if (result.details?.displayPhoneNumber) config.displayPhoneNumber = result.details.displayPhoneNumber;
      if (result.details?.qualityRating) config.qualityRating = result.details.qualityRating;
      await config.save();
    } else {
      config.connectionStatus = 'FAILED';
      config.lastError = result.error || result.message;
      await config.save();
    }

    return {
      ...result,
      connectionStatus: config.connectionStatus,
    };
  }

  /**
   * Resets/clears stored credentials
   */
  async resetConfig(): Promise<MaskedCloudConfig> {
    await WhatsAppCloudConfig.deleteMany({});
    return this.getMaskedConfig();
  }
}

export const whatsAppCloudConfigService = new WhatsAppCloudConfigService();
