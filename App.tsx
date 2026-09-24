import React, { useState } from 'react';
import Home from './components/Home';
import SettingsDashboard from './components/SettingsDashboard';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Layout from './components/Layout';
import { UserRole } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SavedItemsView from './components/SavedItemsView';
import AdminDashboard from './components/AdminDashboard';
import DesignSystem from './components/DesignSystem';
import MyCourses from './components/MyCourses';
import CalendarView from './components/CalendarView';
import Uploads from './components/Uploads';
import { DialogProvider } from './components/ui/ConfirmDialog';
import { ToastProvider } from './components/ui/Toast';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#design-system') return 'design-system';
    return 'dashboard';
  });
  const [impersonatedRole, setImpersonatedRole] = useState<UserRole | null>(null);

  // Determine real role
  let realUserRole = UserRole.Student;
  if (user?.role === 'admin') realUserRole = UserRole.Admin;
  else if (user?.role === 'professor') realUserRole = UserRole.Professor;

  // Determine effective role (for UI)
  const userRole = impersonatedRole || realUserRole;

  const renderContent = () => {
    if (activeView === 'settings') return <SettingsDashboard />;
    if (activeView === 'admin' && userRole === UserRole.Admin) return <AdminDashboard />;
    if (activeView === 'saved') return <SavedItemsView />;
    if (activeView === 'courses') return <MyCourses userRole={userRole} />;
    if (activeView === 'calendar') return <CalendarView userRole={userRole} />;
    if (activeView === 'uploads' && userRole !== UserRole.Student) return <Uploads />;
    if (activeView === 'design-system') return <DesignSystem onClose={() => setActiveView('dashboard')} />;

    // Default view ("Home") — shared across all roles, distinct from the
    // full course-management screen ("Meus Cursos"): quick carousel overview
    // instead of the search/grid/list management UI.
    return <Home userRole={userRole} />;
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => { }} onForgotPasswordClick={() => { }} />;
  }

  // Design System runs as a standalone screen — bypass the app shell so the
  // showcase has full control over its own layout.
  if (activeView === 'design-system') {
    return <DesignSystem onClose={() => setActiveView('dashboard')} />;
  }

  return (
    <Layout
      userRole={userRole}
      realUserRole={realUserRole}
      activeView={activeView}
      onNavigate={setActiveView}
      onLogout={logout}
      onImpersonate={setImpersonatedRole}
    >
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <DialogProvider>
          <AppContent />
        </DialogProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
