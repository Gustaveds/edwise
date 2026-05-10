import React from 'react';
import {
    Home, Calendar, BookOpen, Settings, LogOut, User, Shield, Eye, Star,
    Upload, PanelLeftClose, PanelLeft, ChevronDown
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
    userRole: UserRole;
    realUserRole?: UserRole;
    activeView: string;
    onNavigate: (view: string) => void;
    onLogout: () => void;
    onImpersonate?: (role: UserRole | null) => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    userRole,
    realUserRole,
    activeView,
    onNavigate,
    onLogout,
    onImpersonate,
    isCollapsed = false,
    onToggleCollapse,
}) => {
    const menuItems = [
        { id: 'dashboard', label: 'Home',           icon: Home,     roles: [UserRole.Student, UserRole.Professor, UserRole.Admin] },
        { id: 'courses',   label: 'Meus Cursos',    icon: BookOpen, roles: [UserRole.Student, UserRole.Professor, UserRole.Admin] },
        { id: 'saved',     label: 'Meus Recursos',  icon: Star,     roles: [UserRole.Student] },
        { id: 'calendar',  label: 'Calendário',     icon: Calendar, roles: [UserRole.Student, UserRole.Professor, UserRole.Admin] },
        { id: 'uploads',   label: 'Subir Arquivos', icon: Upload,   roles: [UserRole.Professor, UserRole.Admin] },
        { id: 'settings',  label: 'Configurações',  icon: Settings, roles: [UserRole.Student, UserRole.Professor, UserRole.Admin] },
        { id: 'admin',     label: 'Painel Admin',   icon: Shield,   roles: [UserRole.Admin] },
    ];

    const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

    return (
        <aside
            className={`flex flex-col h-screen bg-white border-r border-ink-200 transition-[width] duration-300 ease-soft
                        ${isCollapsed ? 'w-[72px]' : 'w-64'}`}
        >
            {/* Logo + collapse toggle */}
            <div className={`h-16 flex items-center border-b border-ink-200 ${isCollapsed ? 'px-3 justify-center' : 'px-5 justify-between'}`}>
                {!isCollapsed && (
                    <span className="font-display text-xl font-bold tracking-tight text-ink-900">EdWise AI</span>
                )}
                {onToggleCollapse && (
                    <button
                        onClick={onToggleCollapse}
                        className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition-colors"
                        title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                    >
                        {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className={`flex-1 ds-scroll overflow-y-auto py-5 ${isCollapsed ? 'px-2' : 'px-3'} space-y-1`}>
                {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            title={isCollapsed ? item.label : undefined}
                            className={`group w-full flex items-center rounded-xl text-sm font-medium transition-colors
                                ${isCollapsed ? 'h-11 justify-center' : 'h-11 px-3 gap-3'}
                                ${isActive
                                    ? 'bg-brand-50 text-brand-700'
                                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                                }`}
                        >
                            <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-ink-500 group-hover:text-ink-700'}`} />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                            {!isCollapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
                        </button>
                    );
                })}
            </nav>

            {/* Admin View Switcher */}
            {realUserRole === UserRole.Admin && !isCollapsed && (
                <div className="px-3 pb-3">
                    <details className="group surface-muted !border-ink-200 px-3 py-2.5 cursor-pointer">
                        <summary className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-ink-500 list-none">
                            <span>Visualizar como</span>
                            <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-3 flex flex-col gap-1">
                            {[
                                { role: null,                 label: 'Admin (Padrão)', icon: Shield },
                                { role: UserRole.Professor,   label: 'Professor',      icon: User },
                                { role: UserRole.Student,     label: 'Aluno',          icon: Eye },
                            ].map(opt => {
                                const active = (opt.role === null && userRole === UserRole.Admin) || userRole === opt.role;
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.label}
                                        onClick={() => onImpersonate?.(opt.role)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left
                                            ${active ? 'bg-white text-brand-700 font-semibold shadow-card' : 'text-ink-600 hover:bg-white/70 hover:text-ink-900'}`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </details>
                </div>
            )}

            {/* User Profile + Logout */}
            <div className={`border-t border-ink-200 ${isCollapsed ? 'p-2' : 'p-3'}`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-3 px-2 py-2 mb-1">
                        <div className="w-9 h-9 rounded-full bg-brand-gradient grid place-items-center text-white shadow-glow-brand">
                            <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink-900 truncate">Usuário</p>
                            <p className="text-[11px] font-mono uppercase tracking-wider text-ink-500 truncate">{userRole}</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={onLogout}
                    title={isCollapsed ? 'Sair' : undefined}
                    className={`w-full flex items-center rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors
                        ${isCollapsed ? 'h-11 justify-center' : 'h-10 px-3 gap-3'}`}
                >
                    <LogOut className="w-[18px] h-[18px]" />
                    {!isCollapsed && <span>Sair</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
