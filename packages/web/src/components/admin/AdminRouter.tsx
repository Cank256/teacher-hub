import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from '../../pages/AdminDashboard';
import { UserManagement } from '../../pages/admin/UserManagement';
import { ContentManagement } from '../../pages/admin/ContentManagement';
import { SystemSettings } from '../../pages/admin/SystemSettings';
import { Analytics } from '../../pages/admin/Analytics';
import { Reports } from '../../pages/admin/Reports';

export const AdminRouter: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="content" element={<ContentManagement />} />
      <Route path="settings" element={<SystemSettings />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};