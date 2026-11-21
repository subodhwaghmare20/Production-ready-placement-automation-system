import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { whatsAppConfigService } from '../services/whatsappConfig.service';

export const getWhatsAppSettings = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = await whatsAppConfigService.getConfig();
    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWhatsAppSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = await whatsAppConfigService.updateConfig({
      ...req.body,
      adminId: req.admin?.id || (req.admin as any)?._id,
    });
    res.status(200).json({
      success: true,
      message: 'WhatsApp settings updated successfully',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const testWhatsAppConnection = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const mode = req.body.mode || 'PERSONAL_ASSISTED';
    const result = await whatsAppConfigService.testConnection(mode);
    res.status(200).json({
      success: result.success,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
