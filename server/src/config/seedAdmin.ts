import { Admin } from '../models/Admin.model';
import { Role } from '../models/Role.model';
import { env } from './env';
import { logger } from '../utils/logger';

export const seedInitialAdmin = async (): Promise<void> => {
  try {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
      logger.info('Admin seeding skipped: ADMIN_EMAIL or ADMIN_PASSWORD not configured');
      return;
    }

    const existingAdmin = await Admin.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
    if (existingAdmin) {
      logger.info(`Initial admin account verified: ${env.ADMIN_EMAIL}`);
      return;
    }

    const superAdminRole = await Role.findOne({ slug: 'superadmin' });

    const newAdmin = new Admin({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL.toLowerCase(),
      password: env.ADMIN_PASSWORD,
      role: 'superadmin',
      roleId: superAdminRole?._id,
      isActive: true,
    });

    await newAdmin.save();
    logger.success(`Initial admin account created successfully: ${env.ADMIN_EMAIL}`);
  } catch (error) {
    logger.error('Failed to seed initial admin account:', error);
  }
};

