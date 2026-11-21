/**
 * Messaging Provider Interface
 * Abstraction layer decoupling business logic from WhatsApp transport mechanisms.
 */
export interface PersonalizationVariables {
  candidateName: string;
  companyName: string;
  jobRole: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  [key: string]: string | undefined;
}

export interface IMessagingProvider {
  /**
   * Unique identifier name of the provider
   */
  getProviderName(): string;

  /**
   * Validates if provider is ready to send
   */
  isConfigured(): Promise<boolean>;

  /**
   * Interpolates template text with candidate and recruitment drive variables
   */
  personalizeMessage(templateText: string, variables: PersonalizationVariables): string;

  /**
   * Generates standard wa.me click-to-chat URL for assisted web dispatch
   */
  generateClickToChatUrl(normalizedPhoneNumber: string, messageText: string): string;
}

