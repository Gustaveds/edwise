import React from 'react';
import { BookOpen, LogOut, Settings, User, Briefcase, Sun, Moon } from 'lucide-react';
import { UserRole } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  professorView: 'dashboard' | 'settings';
  setProfessorView: (view: 'dashboard' | 'settings') => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ userRole, setUserRole, professorView, setProfessorView, onLogout }) => {
    const { theme, toggleTheme } = useTheme();
    const isProfessorDashboardActive = userRole === UserRole.Professor && professorView === 'dashboard';
    const isStudentDashboardActive = userRole === UserRole.Student;
    const isSettingsActive = userRole === UserRole.Professor && professorView === 'settings';

    const handleLogoClick = () => {
        if (userRole === UserRole.Professor) {
            setProfessorView('dashboard');
        }
        // Para estudantes, clicar no logo não precisa fazer nada especial,
        // pois eles estão sempre na visualização principal do painel.
    };
    
    return (
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <button onClick={handleLogoClick} className="flex items-center space-x-3 cursor-pointer" aria-label="Página Inicial">
                        <div className="bg-blue-800 p-2 rounded-lg">
                            <BookOpen className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-blue-800 dark:text-gray-100">Plataforma EdWise AI</h1>
                    </button>
                    <nav className="flex items-center space-x-4">
                        {/* Modern View Switcher */}
                        <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-full flex items-center space-x-1">
                            <button
                                onClick={() => { setUserRole(UserRole.Professor); setProfessorView('dashboard'); }}
                                className={`flex items-center space-x-2 px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-300 ${isProfessorDashboardActive ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            >
                                <Briefcase className="w-4 h-4" />
                                <span>Professor</span>
                            </button>
                            <button
                                onClick={() => setUserRole(UserRole.Student)}
                                className={`flex items-center space-x-2 px-4 py-1.5 text-sm font-semibold rounded-full transition-colors duration-300 ${isStudentDashboardActive ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            >
                                <User className="w-4 h-4" />
                                <span>Aluno</span>
                            </button>
                        </div>
                        
                        {/* Right-side icons */}
                        <div className="flex items-center space-x-1">
                             {userRole === UserRole.Professor && (
                                <button
                                    onClick={() => setProfessorView('settings')}
                                    className={`p-2 rounded-full transition-colors ${isSettingsActive ? 'bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    aria-label="Configurações"
                                    title="Configurações"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Mudar tema"
                                title="Mudar tema"
                            >
                                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Sair"
                                title="Sair"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default Header;
