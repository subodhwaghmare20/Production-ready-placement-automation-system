import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { CompaniesPage } from '../pages/CompaniesPage';
import { GroupsPage } from '../pages/GroupsPage';
import { GroupDetailPage } from '../pages/GroupDetailPage';
import { SendMessagePage } from '../pages/SendMessagePage';
import { CampaignProgressPage } from '../pages/CampaignProgressPage';
import { WhatsAppConnectionPage } from '../pages/WhatsAppConnectionPage';
import { LoginPage } from '../pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

// Helper redirect component for parameterized legacy paths
const RedirectToGroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/groups/${id}`} replace />;
};

const RedirectToCampaign: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/campaigns/${id}`} replace />;
};

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
          {/* 1. Dashboard */}
          <Route index element={<DashboardPage />} />

          {/* 2. Companies */}
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="companies/:id" element={<CompaniesPage />} />

          {/* 3. Groups (Virtual Contact Lists) */}
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:id" element={<GroupDetailPage />} />

          {/* 4. Send Message & Live Campaign Tracking */}
          <Route path="send-message" element={<SendMessagePage />} />
          <Route path="campaigns/:id" element={<CampaignProgressPage />} />

          {/* 5. WhatsApp Connection */}
          <Route path="whatsapp-connection" element={<WhatsAppConnectionPage />} />

          {/* Legacy Route Redirects for Smooth Transition */}
          <Route path="virtual-groups" element={<Navigate to="/groups" replace />} />
          <Route path="virtual-groups/:id" element={<RedirectToGroupDetail />} />
          <Route path="candidates" element={<Navigate to="/groups" replace />} />
          <Route path="candidates/:id" element={<Navigate to="/groups" replace />} />
          <Route path="whatsapp-messages" element={<Navigate to="/send-message" replace />} />
          <Route path="whatsapp-messages/create" element={<Navigate to="/send-message" replace />} />
          <Route path="whatsapp-messages/:id" element={<RedirectToCampaign />} />
          <Route path="whatsapp-cloud-settings" element={<Navigate to="/whatsapp-connection" replace />} />
          <Route path="contact-fetcher" element={<Navigate to="/groups" replace />} />
          <Route path="campaign-analytics" element={<Navigate to="/" replace />} />
          <Route path="reports" element={<Navigate to="/" replace />} />
          <Route path="settings" element={<Navigate to="/whatsapp-connection" replace />} />

          {/* Fallback to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>

      {/* Fallback for unhandled paths */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
