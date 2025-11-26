import React, { useState } from 'react';
import ProfessorDashboard from './components/ProfessorDashboard';
import StudentDashboard from './components/StudentDashboard';
import SettingsDashboard from './components/SettingsDashboard';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import Layout from './components/Layout';
import { UserRole } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import AdminDashboard from './components/AdminDashboard';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
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

    // Default Views
    if (userRole === UserRole.Student) {
      return <StudentDashboard />;
    } else {
      // Professor and Admin see the Professor Dashboard by default for "Home"
      // This allows Admins to manage courses just like Professors.
      return <ProfessorDashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => { }} onForgotPasswordClick={() => { }} />;
  }

  // Check if we need full screen (e.g. for player) - handled inside components for now or via state
  // For now, Layout handles the structure.

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
      <AppContent />
    </AuthProvider>
  );
};

export default App;
