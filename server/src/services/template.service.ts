import {
  MessageTemplate,
  IMessageTemplate,
  TemplateCategory,
  TemplateStatus,
} from '../models/MessageTemplate.model';
import { generateTemplateId } from '../utils/idGenerator';
import { placeholderService } from './placeholder.service';
import { Candidate } from '../models/Candidate.model';
import { Company } from '../models/Company.model';

export interface CreateTemplateInput {
  name: string;
  subject?: string;
  category: TemplateCategory;
  description?: string;
  content: string;
  language?: string;
  status?: TemplateStatus;
  createdBy?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  subject?: string;
  category?: TemplateCategory;
  description?: string;
  content?: string;
  language?: string;
  status?: TemplateStatus;
  isActive?: boolean;
}

export interface TemplateFilterOptions {
  category?: string;
  language?: string;
  status?: string;
  search?: string;
  isPredefined?: boolean;
  sortBy?: 'name' | 'usageCount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export const PREDEFINED_TEMPLATES: Array<{
  name: string;
  subject: string;
  category: TemplateCategory;
  description: string;
  language: string;
  content: string;
}> = [
  {
    name: 'Placement Opportunity Notice',
    subject: 'Campus Recruitment Opportunity',
    category: 'JOB_OPPORTUNITY',
    description: 'Broadcast announcement for new on-campus/off-campus hiring opportunities.',
    language: 'English',
    content:
      'Dear {{candidateFirstName}},\n\nWe have an exciting placement opportunity from {{companyName}} for the position of {{jobRole}} ({{jobLocation}}).\n\nCompensation: {{salaryPackage}}\nWork Mode: {{workMode}}\n\nInterested students can register their profile on the placement portal.\n\nRegards,\n{{adminName}}',
  },
  {
    name: 'Interview Invitation Shortlist',
    subject: 'Interview Shortlist Schedule',
    category: 'INTERVIEW_INVITATION',
    description: 'Formal interview shortlist invite with date, time, and location/link.',
    language: 'English',
    content:
      'Dear {{candidateFirstName}}, congratulations! 🎉\n\nYou have been shortlisted for an interview with {{companyName}} for the {{jobRole}} role.\n\n📅 Date: {{interviewDate}}\n⏰ Time: {{interviewTime}}\n📍 Venue/Link: {{interviewLocation}}\nMode: {{interviewMode}}\n\nPlease report 15 minutes prior with your college ID and updated resume.\n\nBest of luck!\n{{adminName}} ({{adminContact}})',
  },
  {
    name: 'Interview Round Reminder',
    subject: 'Upcoming Interview Reminder',
    category: 'INTERVIEW_REMINDER',
    description: 'Timely reminder alert dispatched hours prior to scheduled interviews.',
    language: 'English',
    content:
      'Hi {{candidateFirstName}},\n\nThis is a friendly reminder for your upcoming interview with {{companyName}} for {{jobRole}} scheduled on {{interviewDate}} at {{interviewTime}} ({{interviewLocation}}).\n\nPlease ensure your preparation is in order.\n\nRegards,\n{{adminName}}',
  },
  {
    name: 'Candidate Shortlisted Notification',
    subject: 'Technical Round Shortlist Notification',
    category: 'SHORTLISTED',
    description: 'Informing candidate that they have advanced to the next selection round.',
    language: 'English',
    content:
      'Dear {{candidateFirstName}},\n\nWe are pleased to inform you that you have cleared the initial assessment for {{companyName}} ({{jobRole}})! Next round interview details will be shared shortly.\n\nKeep preparing!\n{{adminName}}',
  },
  {
    name: 'Application Status Update (Rejection)',
    subject: 'Recruitment Drive Status Update',
    category: 'REJECTED',
    description: 'Empathetic and professional notification encouraging candidate growth.',
    language: 'English',
    content:
      'Dear {{candidateFirstName}},\n\nThank you for participating in the campus drive with {{companyName}} for {{jobRole}}. While you were not selected for this specific opening, your participation was commendable. Keep practicing for upcoming drives!\n\nRegards,\n{{adminName}}',
  },
  {
    name: 'Final Placement Confirmation & Offer',
    subject: 'Final Placement Offer Congratulation',
    category: 'PLACEMENT_CONFIRMATION',
    description: 'Celebratory announcement for candidates who have secured final placement offers.',
    language: 'English',
    content:
      'Heartiest Congratulations {{candidateName}}! 🎊\n\nWe are proud to announce that you have officially secured a placement offer from {{companyName}} for the role of {{jobRole}} with a package of {{salaryPackage}}!\n\nFormal documentation instructions will follow.\n\nTraining & Placement Cell\n{{adminName}}',
  },
  {
    name: 'Document Verification Submission Request',
    subject: 'Mandatory Document Verification Request',
    category: 'DOCUMENT_REQUEST',
    description: 'Instructions for submitting academic marksheets, resume, and ID proofs.',
    language: 'English',
    content:
      'Dear {{candidateFirstName}},\n\nTo complete your verification for {{companyName}} ({{jobRole}}), please submit your academic marksheets, degree proof ({{degree}} - {{branch}}), and college ID by {{interviewDate}}.\n\nRegards,\n{{adminName}} ({{adminContact}})',
  },
  {
    name: 'General Placement Bulletin Announcement',
    subject: 'Placement Drive Notice',
    category: 'GENERAL_ANNOUNCEMENT',
    description: 'Important bulletin or instructions regarding upcoming placement activities.',
    language: 'English',
    content:
      'Dear {{candidateName}},\n\nImportant announcement regarding the ongoing recruitment drive by {{companyName}} ({{jobRole}}). Please check your student portal for immediate schedule updates.\n\nDate: {{currentDate}}\nPlacement Cell',
  },
];

export class TemplateService {
  /**
   * Seeds the standard predefined templates if not present.
   */
  async seedPredefinedTemplates(): Promise<number> {
    let seededCount = 0;
    for (const t of PREDEFINED_TEMPLATES) {
      const existing = await MessageTemplate.findOne({
        name: t.name,
        isPredefined: true,
      });

      if (!existing) {
        const templateId = generateTemplateId();
        await MessageTemplate.create({
          templateId,
          name: t.name,
          subject: t.subject,
          category: t.category,
          description: t.description,
          content: t.content,
          language: t.language,
          status: 'Active',
          isActive: true,
          isPredefined: true,
          usageCount: 0,
        });
        seededCount++;
      }
    }
    return seededCount;
  }

  /**
   * Get templates with search, filter, and sorting
   */
  async getTemplates(filters: TemplateFilterOptions = {}): Promise<IMessageTemplate[]> {
    await this.seedPredefinedTemplates();

    const query: Record<string, unknown> = {};

    if (filters.category && filters.category !== 'ALL') {
      // Support category matching
      query.category = filters.category;
    }

    if (filters.language && filters.language !== 'ALL') {
      query.language = filters.language;
    }

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.isPredefined !== undefined) {
      query.isPredefined = filters.isPredefined;
    }

    if (filters.search) {
      const term = filters.search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { subject: { $regex: term, $options: 'i' } },
        { content: { $regex: term, $options: 'i' } },
        { templateId: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
    }

    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    return MessageTemplate.find(query).sort({
      isPredefined: -1,
      [sortField]: sortOrder,
    });
  }

  /**
   * Get single template by MongoDB _id or institutional templateId
   */
  async getTemplateById(id: string): Promise<IMessageTemplate | null> {
    return MessageTemplate.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { templateId: id }],
    }).populate('createdBy', 'name email');
  }

  /**
   * Create custom template
   */
  async createTemplate(input: CreateTemplateInput): Promise<IMessageTemplate> {
    const templateId = generateTemplateId();

    const template = await MessageTemplate.create({
      templateId,
      name: input.name.trim(),
      subject: input.subject?.trim(),
      category: input.category,
      description: input.description?.trim(),
      content: input.content.trim(),
      language: input.language?.trim() || 'English',
      status: input.status || 'Active',
      isActive: (input.status || 'Active') === 'Active',
      isPredefined: false,
      usageCount: 0,
      createdBy: input.createdBy,
    });

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<IMessageTemplate | null> {
    const template = await this.getTemplateById(id);
    if (!template) return null;

    if (input.name !== undefined) template.name = input.name.trim();
    if (input.subject !== undefined) template.subject = input.subject.trim();
    if (input.category !== undefined) template.category = input.category;
    if (input.description !== undefined) template.description = input.description.trim();
    if (input.content !== undefined) template.content = input.content.trim();
    if (input.language !== undefined) template.language = input.language.trim();
    if (input.status !== undefined) {
      template.status = input.status;
      template.isActive = input.status === 'Active';
    }
    if (input.isActive !== undefined) {
      template.isActive = input.isActive;
      template.status = input.isActive ? 'Active' : 'Inactive';
    }

    await template.save();
    return template;
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(id: string, adminId?: string): Promise<IMessageTemplate> {
    const original = await this.getTemplateById(id);
    if (!original) {
      throw new Error('Original template not found to duplicate');
    }

    const templateId = generateTemplateId();
    const duplicated = await MessageTemplate.create({
      templateId,
      name: `Copy of ${original.name}`,
      subject: original.subject ? `Copy of ${original.subject}` : undefined,
      category: original.category,
      description: original.description,
      content: original.content,
      language: original.language || 'English',
      status: 'Active',
      isActive: true,
      isPredefined: false,
      usageCount: 0,
      createdBy: adminId,
    });

    return duplicated;
  }

  /**
   * Delete template. Protects predefined templates from deletion.
   */
  async deleteTemplate(id: string): Promise<{ success: boolean; message: string }> {
    const template = await this.getTemplateById(id);
    if (!template) {
      return { success: false, message: 'Template not found' };
    }

    if (template.isPredefined) {
      return { success: false, message: 'Standard institutional templates cannot be deleted.' };
    }

    await MessageTemplate.findByIdAndDelete(template._id);
    return { success: true, message: 'Template deleted successfully' };
  }

  /**
   * Increments template usage counter
   */
  async incrementUsage(id: string): Promise<void> {
    await MessageTemplate.findByIdAndUpdate(id, { $inc: { usageCount: 1 } });
  }

  /**
   * Validates template content for syntax & spelling
   */
  validateContent(content: string) {
    return placeholderService.validateTemplate(content);
  }

  /**
   * Previews template personalization with either real DB records or sample variables
   */
  async previewTemplate(
    content: string,
    options: {
      candidateId?: string;
      companyId?: string;
      metadata?: any;
      adminName?: string;
    } = {}
  ) {
    let variables: Record<string, string>;

    if (options.candidateId && options.companyId) {
      const [candidate, company] = await Promise.all([
        Candidate.findById(options.candidateId),
        Company.findById(options.companyId),
      ]);
      variables = placeholderService.buildVariables(
        candidate,
        company,
        options.metadata,
        { name: options.adminName || 'Placement Cell' }
      );
    } else {
      variables = placeholderService.getSampleVariables();
      if (options.metadata) {
        Object.assign(variables, options.metadata);
      }
    }

    const result = placeholderService.personalizeAndValidate(content, variables);
    return {
      ...result,
      variablesUsed: variables,
    };
  }

  /**
   * Exports templates to JSON
   */
  async exportTemplates(templateIds?: string[]) {
    const query: Record<string, unknown> = {};
    if (templateIds && templateIds.length > 0) {
      query.$or = [{ _id: { $in: templateIds } }, { templateId: { $in: templateIds } }];
    }

    const templates = await MessageTemplate.find(query).lean();
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: templates.length,
      templates: templates.map((t) => ({
        templateId: t.templateId,
        name: t.name,
        subject: t.subject,
        category: t.category,
        description: t.description,
        content: t.content,
        language: t.language,
        status: t.status,
        placeholders: t.placeholders,
      })),
    };
  }

  /**
   * Imports templates from JSON with validation and duplicate detection
   */
  async importTemplates(
    importData: any,
    options: { overwrite?: boolean; adminId?: string } = {}
  ): Promise<{
    importedCount: number;
    skippedCount: number;
    errors: string[];
  }> {
    const items = Array.isArray(importData) ? importData : importData?.templates;
    if (!Array.isArray(items)) {
      throw new Error('Invalid import format: expected array of templates or object with templates array.');
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const [idx, item] of items.entries()) {
      if (!item.name || !item.content || !item.category) {
        errors.push(`Row ${idx + 1}: Missing name, category, or content.`);
        skippedCount++;
        continue;
      }

      const existing = await MessageTemplate.findOne({ name: item.name.trim() });
      if (existing) {
        if (options.overwrite && !existing.isPredefined) {
          existing.subject = item.subject || existing.subject;
          existing.category = item.category || existing.category;
          existing.description = item.description || existing.description;
          existing.content = item.content;
          existing.language = item.language || existing.language;
          existing.status = item.status || existing.status;
          await existing.save();
          importedCount++;
        } else {
          // Rename or skip
          errors.push(`Template '${item.name}' already exists. Skipped to prevent unintended overwrite.`);
          skippedCount++;
        }
      } else {
        const templateId = generateTemplateId();
        await MessageTemplate.create({
          templateId,
          name: item.name.trim(),
          subject: item.subject?.trim(),
          category: item.category,
          description: item.description?.trim(),
          content: item.content.trim(),
          language: item.language || 'English',
          status: item.status || 'Active',
          isActive: (item.status || 'Active') === 'Active',
          isPredefined: false,
          usageCount: 0,
          createdBy: options.adminId,
        });
        importedCount++;
      }
    }

    return { importedCount, skippedCount, errors };
  }
}

export const templateService = new TemplateService();
