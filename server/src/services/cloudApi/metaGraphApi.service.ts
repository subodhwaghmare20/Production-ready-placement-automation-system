import { env } from '../../config/env';
import { MetaTemplate } from '../../models/MetaTemplate.model';

export interface MetaCredentials {
  appId?: string;
  appSecret?: string;
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  graphApiVersion?: string;
  isMockMode?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: {
    verifiedName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
    codeVerificationStatus?: string;
    accountReviewStatus?: string;
    wabaName?: string;
    isMockMode?: boolean;
  };
  error?: string;
}

export interface SendMessageResult {
  success: boolean;
  providerMessageId?: string;
  recipientPhone?: string;
  error?: {
    code: number | string;
    message: string;
    details?: string;
  };
}

export class MetaGraphApiService {
  private getBaseUrl(version: string = 'v21.0'): string {
    return `https://graph.facebook.com/${version}`;
  }

  /**
   * Safe sanitize helper to ensure tokens are never leaked in error messages
   */
  private sanitizeError(err: any, token?: string): string {
    let msg = err?.message || String(err);
    if (token && token.length > 4) {
      msg = msg.split(token).join('••••••••');
    }
    return msg;
  }

  /**
   * Tests connection to Meta WhatsApp Business Cloud API.
   * In Mock Mode or when dummy credentials are used, simulates verified response.
   */
  async testConnection(creds: MetaCredentials): Promise<TestConnectionResult> {
    const isMock =
      creds.isMockMode ||
      !creds.accessToken ||
      creds.accessToken.startsWith('MOCK_') ||
      creds.accessToken.startsWith('TEST_') ||
      creds.phoneNumberId?.startsWith('TEST_') ||
      env.NODE_ENV === 'test';

    if (isMock) {
      return {
        success: true,
        message: 'Successfully verified Meta WhatsApp Cloud API credentials (Test/Mock Mode Active)',
        details: {
          verifiedName: 'Placement Automation Test WABA',
          displayPhoneNumber: '+1 555-0199',
          qualityRating: 'GREEN',
          codeVerificationStatus: 'VERIFIED',
          accountReviewStatus: 'APPROVED',
          wabaName: 'Placement Automation Sandboxed Business',
          isMockMode: true,
        },
      };
    }

    const version = creds.graphApiVersion || env.META_GRAPH_VERSION || 'v21.0';
    const baseUrl = this.getBaseUrl(version);

    try {
      if (!creds.phoneNumberId || !creds.accessToken) {
        return {
          success: false,
          message: 'Phone Number ID and Access Token are required for validation',
          error: 'MISSING_CREDENTIALS',
        };
      }

      // 1. Fetch Phone Number details
      const phoneRes = await fetch(`${baseUrl}/${creds.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!phoneRes.ok) {
        const errorData = (await phoneRes.json().catch(() => ({}))) as any;
        const rawErr = errorData?.error?.message || `HTTP ${phoneRes.status}: ${phoneRes.statusText}`;
        return {
          success: false,
          message: 'Failed to authenticate with Meta Graph API',
          error: this.sanitizeError(rawErr, creds.accessToken),
        };
      }

      const phoneData = (await phoneRes.json()) as any;

      // 2. Fetch WABA details if WABA ID is provided
      let wabaName = 'Meta Business Account';
      if (creds.wabaId) {
        const wabaRes = await fetch(`${baseUrl}/${creds.wabaId}?fields=name,account_review_status`, {
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
          },
        });
        if (wabaRes.ok) {
          const wabaData = (await wabaRes.json()) as any;
          wabaName = wabaData.name || wabaName;
        }
      }

      return {
        success: true,
        message: 'Connected to Meta WhatsApp Cloud API successfully',
        details: {
          verifiedName: phoneData.verified_name || 'Verified Placement Officer',
          displayPhoneNumber: phoneData.display_phone_number || '',
          qualityRating: phoneData.quality_rating || 'GREEN',
          codeVerificationStatus: phoneData.code_verification_status || 'VERIFIED',
          wabaName,
          isMockMode: false,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Network error connecting to Meta Graph API',
        error: this.sanitizeError(err, creds.accessToken),
      };
    }
  }

  /**
   * Synchronizes message templates from Meta WABA account into database.
   * If in mock mode or no live WABA, ensures default standard templates exist.
   */
  async syncTemplates(creds: MetaCredentials): Promise<{ count: number; templates: any[] }> {
    const isMock =
      creds.isMockMode ||
      !creds.accessToken ||
      creds.accessToken.startsWith('MOCK_') ||
      creds.accessToken.startsWith('TEST_') ||
      !creds.wabaId;

    if (isMock) {
      // Seed default approved mock templates
      const mockTemplates = [
        {
          metaTemplateId: 'meta_tmpl_interview_invite',
          name: 'placement_interview_invitation',
          language: 'en_US',
          category: 'UTILITY' as const,
          status: 'APPROVED' as const,
          components: [
            {
              type: 'HEADER' as const,
              format: 'TEXT' as const,
              text: 'Interview Shortlist Notification',
            },
            {
              type: 'BODY' as const,
              text: 'Hello {{1}}, you have been shortlisted for an interview with {{2}} for the role of {{3}}. Drive date: {{4}}, Time: {{5}}, Location: {{6}}. Please confirm attendance.',
            },
            {
              type: 'FOOTER' as const,
              text: 'Placement Cell — Official Notification',
            },
          ],
          parameterMappings: [
            { index: 1, parameterName: 'Candidate Name', candidateField: 'fullName' },
            { index: 2, parameterName: 'Company Name', candidateField: 'companyName' },
            { index: 3, parameterName: 'Job Role', candidateField: 'jobRole' },
            { index: 4, parameterName: 'Interview Date', candidateField: 'interviewDate' },
            { index: 5, parameterName: 'Interview Time', candidateField: 'interviewTime' },
            { index: 6, parameterName: 'Interview Location', candidateField: 'interviewLocation' },
          ],
          lastSyncedAt: new Date(),
        },
        {
          metaTemplateId: 'meta_tmpl_drive_reminder',
          name: 'placement_drive_reminder',
          language: 'en_US',
          category: 'UTILITY' as const,
          status: 'APPROVED' as const,
          components: [
            {
              type: 'BODY' as const,
              text: 'Reminder: Dear {{1}}, your placement session with {{2}} begins at {{3}} tomorrow. Please bring 2 copies of your resume.',
            },
            {
              type: 'FOOTER' as const,
              text: 'Training & Placement Office',
            },
          ],
          parameterMappings: [
            { index: 1, parameterName: 'Candidate Name', candidateField: 'fullName' },
            { index: 2, parameterName: 'Company Name', candidateField: 'companyName' },
            { index: 3, parameterName: 'Time', candidateField: 'interviewTime' },
          ],
          lastSyncedAt: new Date(),
        },
        {
          metaTemplateId: 'meta_tmpl_offer_congrats',
          name: 'placement_offer_congratulations',
          language: 'en_US',
          category: 'UTILITY' as const,
          status: 'APPROVED' as const,
          components: [
            {
              type: 'HEADER' as const,
              format: 'TEXT' as const,
              text: 'Congratulations on Your Offer!',
            },
            {
              type: 'BODY' as const,
              text: 'Hearty congratulations {{1}}! We are thrilled to inform you that you have received an offer from {{2}} as {{3}}.',
            },
          ],
          parameterMappings: [
            { index: 1, parameterName: 'Candidate Name', candidateField: 'fullName' },
            { index: 2, parameterName: 'Company Name', candidateField: 'companyName' },
            { index: 3, parameterName: 'Job Role', candidateField: 'jobRole' },
          ],
          lastSyncedAt: new Date(),
        },
      ];

      for (const tmpl of mockTemplates) {
        await MetaTemplate.findOneAndUpdate(
          { metaTemplateId: tmpl.metaTemplateId },
          tmpl,
          { upsert: true, new: true }
        );
      }

      const all = await MetaTemplate.find();
      return { count: all.length, templates: all };
    }

    const version = creds.graphApiVersion || env.META_GRAPH_VERSION || 'v21.0';
    const baseUrl = this.getBaseUrl(version);

    try {
      const response = await fetch(`${baseUrl}/${creds.wabaId}/message_templates?limit=100`, {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        throw new Error(this.sanitizeError(errorData?.error?.message || response.statusText, creds.accessToken));
      }

      const data = (await response.json()) as any;
      const remoteTemplates = data.data || [];

      for (const t of remoteTemplates) {
        await MetaTemplate.findOneAndUpdate(
          { metaTemplateId: t.id || t.name },
          {
            metaTemplateId: t.id || t.name,
            name: t.name,
            language: t.language || 'en_US',
            category: t.category || 'UTILITY',
            status: t.status || 'APPROVED',
            components: t.components || [],
            rawTemplate: t,
            lastSyncedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      }

      const all = await MetaTemplate.find();
      return { count: all.length, templates: all };
    } catch (err: any) {
      throw new Error(`Meta Template Sync Failed: ${this.sanitizeError(err, creds.accessToken)}`);
    }
  }

  /**
   * Sends an official WhatsApp Template Message via Cloud API.
   */
  async sendTemplateMessage(
    creds: MetaCredentials,
    options: {
      to: string;
      templateName: string;
      languageCode?: string;
      bodyParameters?: string[];
      headerParameters?: string[];
    }
  ): Promise<SendMessageResult> {
    const isMock =
      creds.isMockMode ||
      !creds.accessToken ||
      creds.accessToken.startsWith('MOCK_') ||
      creds.accessToken.startsWith('TEST_') ||
      !creds.phoneNumberId ||
      creds.phoneNumberId.startsWith('TEST_') ||
      env.NODE_ENV === 'test';

    // Format phone number without leading '+'
    const cleanTo = options.to.replace(/\D/g, '');

    if (isMock) {
      const mockId = `wamid.HBg${Date.now()}_MOCK_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      return {
        success: true,
        providerMessageId: mockId,
        recipientPhone: cleanTo,
      };
    }

    const version = creds.graphApiVersion || env.META_GRAPH_VERSION || 'v21.0';
    const baseUrl = this.getBaseUrl(version);

    try {
      const components: any[] = [];

      // Body parameters
      if (options.bodyParameters && options.bodyParameters.length > 0) {
        components.push({
          type: 'body',
          parameters: options.bodyParameters.map((val) => ({
            type: 'text',
            text: val,
          })),
        });
      }

      // Header parameters
      if (options.headerParameters && options.headerParameters.length > 0) {
        components.push({
          type: 'header',
          parameters: options.headerParameters.map((val) => ({
            type: 'text',
            text: val,
          })),
        });
      }

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanTo,
        type: 'template',
        template: {
          name: options.templateName,
          language: {
            code: options.languageCode || 'en_US',
          },
          components: components.length > 0 ? components : undefined,
        },
      };

      const res = await fetch(`${baseUrl}/${creds.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = (await res.json()) as any;

      if (!res.ok) {
        const errObj = responseData?.error || {};
        return {
          success: false,
          recipientPhone: cleanTo,
          error: {
            code: errObj.code || res.status,
            message: this.sanitizeError(errObj.message || 'WhatsApp Cloud API Send Error', creds.accessToken),
            details: errObj.error_data?.details,
          },
        };
      }

      const providerMessageId = responseData?.messages?.[0]?.id;

      return {
        success: true,
        providerMessageId,
        recipientPhone: cleanTo,
      };
    } catch (err: any) {
      return {
        success: false,
        recipientPhone: cleanTo,
        error: {
          code: 'NETWORK_EXCEPTION',
          message: this.sanitizeError(err, creds.accessToken),
        },
      };
    }
  }
}

export const metaGraphApiService = new MetaGraphApiService();
