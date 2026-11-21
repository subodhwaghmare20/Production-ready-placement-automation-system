import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import candidateRoutes from './candidate.routes';
import companyRoutes from './company.routes';
import groupRoutes from './group.routes';
import contactFetcherRoutes from './contactFetcher.routes';
import campaignRoutes from './campaign.routes';
import templateRoutes from './template.routes';
import whatsappConfigRoutes from './whatsappConfig.routes';
import analyticsRoutes from './analytics.routes';
import reportRoutes from './report.routes';
import webhookRoutes from './webhook.routes';
import whatsappCloudRoutes from './whatsappCloud.routes';

// Module 11: Admin Settings, Audit Logs, Roles & Permissions
import adminManagementRoutes from './adminManagement.routes';
import roleRoutes from './role.routes';
import auditLogRoutes from './auditLog.routes';
import systemSettingsRoutes from './systemSettings.routes';
import sessionRoutes from './session.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/candidates', candidateRoutes);
router.use('/companies', companyRoutes);
router.use('/groups', groupRoutes);
router.use('/contact-fetcher', contactFetcherRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/templates', templateRoutes);
router.use('/message-templates', templateRoutes);
router.use('/whatsapp-settings', whatsappConfigRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);

// Module 10: Official WhatsApp Business Cloud API & Webhooks
router.use('/webhooks', webhookRoutes);
router.use('/whatsapp/cloud-api', whatsappCloudRoutes);
router.use('/whatsapp', whatsappCloudRoutes);

// Module 11: Admin Settings, Audit Logs, Roles & Permissions
router.use('/admins', adminManagementRoutes);
router.use('/roles', roleRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/settings/system', systemSettingsRoutes);
router.use('/sessions', sessionRoutes);

export default router;
