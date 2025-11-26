import React from 'react';
import { Home, Calendar, BookOpen, Settings, LogOut, User, Shield, Eye } from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  userRole: UserRole; // This is the effective role (what is being shown)
  realUserRole?: UserRole; // This is the actual logged in user role
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  onImpersonate?: (role: UserRole | null) => void;
  isCollapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  userRole,
  realUserRole,
  activeView,
  onNavigate,
  onLogout,
  onImpersonate,
  isCollapsed = false
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: Home, roles: [UserRole.Student, UserRole.Professor, UserRole.Admin] },
    { id: 'courses', label: 'Meus Cursos', icon: BookOpen, roles: [UserRole.Student, UserRole.Professor, UserRole.Admin] },
    { id: 'calendar', label: 'Calendário', icon: Calendar, roles: [UserRole.Student, UserRole.Professor, UserRole.Admin] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: [UserRole.Student, UserRole.Professor, UserRole.Admin] },
    { id: 'admin', label: 'Painel Admin', icon: Shield, roles: [UserRole.Admin] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className={`flex flex-col h-screen bg-gray-900 text-white transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} border-r border-gray-800`}>
      {/* Logo Area */}
      <div className="p-6 flex items-center justify-center border-b border-gray-800">
        {isCollapsed ? (
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">E</span>
        ) : (
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">EdWise AI</h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <Icon className={`w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'} transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Admin View Switcher */}
      {realUserRole === UserRole.Admin && !isCollapsed && (
        <div className="px-4 py-2">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-2 uppercase font-bold">Visualizar como:</p>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => onImpersonate && onImpersonate(null)}
                className={`text-xs flex items-center ${userRole === UserRole.Admin ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                <Shield className="w-3 h-3 mr-2" /> Admin (Padrão)
              </button>
              <button
                onClick={() => onImpersonate && onImpersonate(UserRole.Professor)}
                className={`text-xs flex items-center ${userRole === UserRole.Professor ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                <User className="w-3 h-3 mr-2" /> Professor
              </button>
              <button
                onClick={() => onImpersonate && onImpersonate(UserRole.Student)}
                className={`text-xs flex items-center ${userRole === UserRole.Student ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                <Eye className="w-3 h-3 mr-2" /> Aluno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-gray-800">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
          {!isCollapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">Usuário</p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors`}
        >
          <LogOut className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;