import React from 'react';
import { LogOut, Settings, User, Briefcase, BookOpen, Sun, Moon } from 'lucide-react';
import { UserRole } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
    userRole: UserRole;
    setUserRole: (role: UserRole) => void;
    professorView: 'dashboard' | 'settings';
    setProfessorView: (view: 'dashboard' | 'settings') => void;
    onLogout: () => void;
}

/**
 * Legacy top header. Kept for backwards-compat: the active app shell uses
 * <Layout> + <Sidebar> instead. Tokens here mirror the rest of the DS in case
 * this gets re-enabled.
 */
const Header: React.FC<HeaderProps> = ({ userRole, setUserRole, professorView, setProfessorView, onLogout }) => {
    const { theme, toggleTheme } = useTheme();
    const isProfessorDashboardActive = userRole === UserRole.Professor && professorView === 'dashboard';
    const isStudentDashboardActive   = userRole === UserRole.Student;
    const isSettingsActive           = userRole === UserRole.Professor && professorView === 'settings';

    return (
        <header className="bg-white border-b border-ink-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <button
                        onClick={() => userRole === UserRole.Professor && setProfessorView('dashboard')}
                        className="flex items-center gap-2"
                    >
                        <div className="w-9 h-9 rounded-xl bg-brand-50 grid place-items-center">
                            <BookOpen className="w-4 h-4 text-brand-600" />
                        </div>
                        <span className="font-display text-lg font-bold tracking-tight text-ink-900">EdWise AI</span>
                    </button>
                    <nav className="flex items-center gap-3">
                        <div className="surface-muted p-1 rounded-pill flex items-center gap-1">
                            <button
                                onClick={() => { setUserRole(UserRole.Professor); setProfessorView('dashboard'); }}
                                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-pill transition-colors
                                    ${isProfessorDashboardActive ? 'bg-white text-brand-700 shadow-card' : 'text-ink-600 hover:text-ink-900'}`}
                            >
                                <Briefcase className="w-4 h-4" />
                                Professor
                            </button>
                            <button
                                onClick={() => setUserRole(UserRole.Student)}
                                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-pill transition-colors
                                    ${isStudentDashboardActive ? 'bg-white text-brand-700 shadow-card' : 'text-ink-600 hover:text-ink-900'}`}
                            >
                                <User className="w-4 h-4" />
                                Aluno
                            </button>
                        </div>
                        {userRole === UserRole.Professor && (
                            <button
                                onClick={() => setProfessorView('settings')}
                                className={`p-2 rounded-lg transition-colors ${isSettingsActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900'}`}
                                title="Configurações"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition-colors"
                            title="Mudar tema"
                        >
                            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onLogout}
                            className="p-2 rounded-lg text-ink-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Sair"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default Header;
