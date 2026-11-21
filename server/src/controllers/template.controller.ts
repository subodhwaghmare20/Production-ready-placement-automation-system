import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { templateService } from '../services/template.service';
import { placeholderService } from '../services/placeholder.service';

export const getTemplates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, language, status, search, isPredefined, sortBy, sortOrder } = req.query;
    const templates = await templateService.getTemplates({
      category: category as string | undefined,
      language: language as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
      isPredefined: isPredefined !== undefined ? isPredefined === 'true' : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });
    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
};

export const getTemplateById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, templateName, subject, category, description, content, messageBody, language, status } =
      req.body;

    const finalName = name || templateName;
    const finalContent = content || messageBody;

    if (!finalName || !category || !finalContent) {
      res.status(400).json({
        success: false,
        message: 'Name, category, and message body are required.',
      });
      return;
    }

    const template = await templateService.createTemplate({
      name: finalName,
      subject,
      category,
      description,
      content: finalContent,
      language,
      status,
      createdBy: req.admin?.id || (req.admin as any)?._id,
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, templateName, content, messageBody, ...rest } = req.body;
    const finalName = name || templateName;
    const finalContent = content || messageBody;

    const payload = {
      ...rest,
      ...(finalName ? { name: finalName } : {}),
      ...(finalContent ? { content: finalContent } : {}),
    };

    const template = await templateService.updateTemplate(req.params.id, payload);
    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

export const duplicateTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.admin?.id || (req.admin as any)?._id;
    const duplicated = await templateService.duplicateTemplate(req.params.id, adminId);
    res.status(201).json({
      success: true,
      message: `Template duplicated successfully as '${duplicated.name}'`,
      data: duplicated,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to duplicate template' });
  }
};

export const deleteTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await templateService.deleteTemplate(req.params.id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const validateTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { content, messageBody } = req.body;
    const text = content || messageBody || '';
    const result = templateService.validateContent(text);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const previewTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { content, messageBody, candidateId, companyId, metadata } = req.body;
    const text = content || messageBody || '';

    const preview = await templateService.previewTemplate(text, {
      candidateId,
      companyId,
      metadata,
      adminName: req.admin?.name,
    });

    res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to generate preview' });
  }
};

export const getPlaceholders = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const placeholders = placeholderService.getSupportedPlaceholders();
    res.status(200).json({
      success: true,
      data: placeholders,
    });
  } catch (error) {
    next(error);
  }
};

export const exportTemplates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ids = req.query.ids ? (req.query.ids as string).split(',') : undefined;
    const result = await templateService.exportTemplates(ids);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const importTemplates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { templates, overwrite } = req.body;
    const adminId = req.admin?.id || (req.admin as any)?._id;

    const result = await templateService.importTemplates(templates, {
      overwrite: Boolean(overwrite),
      adminId,
    });

    res.status(200).json({
      success: true,
      message: `Imported ${result.importedCount} templates, skipped ${result.skippedCount}.`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Import failed' });
  }
};
