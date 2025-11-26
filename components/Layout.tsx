import React from 'react';
import Sidebar from './Sidebar';
import { UserRole } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    userRole: UserRole;
    realUserRole?: UserRole;
    activeView: string;
    onNavigate: (view: string) => void;
    onLogout: () => void;
    onImpersonate?: (role: UserRole | null) => void;
    fullScreen?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
    children,
    userRole,
    realUserRole,
    activeView,
    onNavigate,
    onLogout,
    onImpersonate,
    fullScreen = false
}) => {
    if (fullScreen) {
        return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">{children}</div>;
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar
                userRole={userRole}
                realUserRole={realUserRole}
                activeView={activeView}
                onNavigate={onNavigate}
                onLogout={onLogout}
                onImpersonate={onImpersonate}
            />
            <main className="flex-1 overflow-y-auto relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
