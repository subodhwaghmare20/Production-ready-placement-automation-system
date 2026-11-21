import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { CandidatesPage } from '../pages/CandidatesPage';
import { CandidateProfilePage } from '../pages/CandidateProfilePage';
import { CompaniesPage } from '../pages/CompaniesPage';
import { CompanyProfilePage } from '../pages/CompanyProfilePage';
import { VirtualGroupsPage } from '../pages/VirtualGroupsPage';
import { CreateVirtualGroupPage } from '../pages/CreateVirtualGroupPage';
import { VirtualGroupDetailPage } from '../pages/VirtualGroupDetailPage';
import { ContactFetcherPage } from '../pages/ContactFetcherPage';
import { WhatsAppMessagesPage } from '../pages/WhatsAppMessagesPage';
import { CreateCampaignPage } from '../pages/CreateCampaignPage';
import { CampaignDetailPage } from '../pages/CampaignDetailPage';
import { CampaignValidationPage } from '../pages/CampaignValidationPage';
import { CampaignProcessingPage } from '../pages/CampaignProcessingPage';
import { MessageTemplatesPage } from '../pages/MessageTemplatesPage';
import { CampaignAnalyticsPage } from '../pages/CampaignAnalyticsPage';
import { RecipientTrackingPage } from '../pages/RecipientTrackingPage';
import { CampaignComparisonPage } from '../pages/CampaignComparisonPage';
import { ReportsPage } from '../pages/ReportsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { WhatsAppCloudSettingsPage } from '../pages/WhatsAppCloudSettingsPage';
import { MetaTemplatesPage } from '../pages/MetaTemplatesPage';
import { InboundMessagesPage } from '../pages/InboundMessagesPage';
import { WebhookEventsPage } from '../pages/WebhookEventsPage';
import { AdminManagementPage } from '../pages/AdminManagementPage';
import { RolePermissionMatrixPage } from '../pages/RolePermissionMatrixPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { SessionManagementPage } from '../pages/SessionManagementPage';
import { SystemSettingsPage } from '../pages/SystemSettingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes (e.g. Login) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Routes (Authenticated Admin Only) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="candidates/:id" element={<CandidateProfilePage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="companies/:id" element={<CompanyProfilePage />} />
          <Route path="virtual-groups" element={<VirtualGroupsPage />} />
          <Route path="virtual-groups/create" element={<CreateVirtualGroupPage />} />
          <Route path="virtual-groups/:id" element={<VirtualGroupDetailPage />} />
          <Route path="contact-fetcher" element={<ContactFetcherPage />} />
          
          {/* WhatsApp Messaging Engine Routes */}
          <Route path="whatsapp-messages" element={<WhatsAppMessagesPage />} />
          <Route path="whatsapp-messages/create" element={<CreateCampaignPage />} />
          <Route path="whatsapp-messages/:id" element={<CampaignDetailPage />} />
          <Route path="whatsapp-messages/:id/validation" element={<CampaignValidationPage />} />
          <Route path="whatsapp-messages/:id/process" element={<CampaignProcessingPage />} />
          <Route path="message-templates" element={<MessageTemplatesPage />} />

          {/* Module 9: Analytics, Tracking, Comparison & Reports */}
          <Route path="campaign-analytics" element={<CampaignAnalyticsPage />} />
          <Route path="recipient-tracking" element={<RecipientTrackingPage />} />
          <Route path="campaign-comparison" element={<CampaignComparisonPage />} />
          <Route path="whatsapp-messages/analytics" element={<Navigate to="/campaign-analytics" replace />} />
          <Route path="whatsapp-messages/recipients" element={<Navigate to="/recipient-tracking" replace />} />
          <Route path="whatsapp-messages/compare" element={<Navigate to="/campaign-comparison" replace />} />

          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Module 10: Official WhatsApp Cloud API & Webhooks */}
          <Route path="whatsapp-cloud-settings" element={<WhatsAppCloudSettingsPage />} />
          <Route path="meta-templates" element={<MetaTemplatesPage />} />
          <Route path="inbound-messages" element={<InboundMessagesPage />} />
          <Route path="webhook-events" element={<WebhookEventsPage />} />

          {/* Module 11: Admin Settings, Audit Logs, Roles & Permissions */}
          <Route path="admins" element={<AdminManagementPage />} />
          <Route path="roles" element={<RolePermissionMatrixPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="sessions" element={<SessionManagementPage />} />
          <Route path="system-settings" element={<SystemSettingsPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      {/* Fallback for unhandled paths */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
