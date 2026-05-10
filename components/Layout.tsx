import React, { useState } from 'react';
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

const COLLAPSE_KEY = 'edwise.sidebar.collapsed';

const Layout: React.FC<LayoutProps> = ({
    children,
    userRole,
    realUserRole,
    activeView,
    onNavigate,
    onLogout,
    onImpersonate,
    fullScreen = false,
}) => {
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
    });

    const toggleCollapse = () => {
        setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch {}
            return next;
        });
    };

    if (fullScreen) {
        return <div className="min-h-screen bg-ink-50 text-ink-900">{children}</div>;
    }

    return (
        <div className="flex h-screen bg-ink-50 text-ink-900 overflow-hidden">
            <Sidebar
                userRole={userRole}
                realUserRole={realUserRole}
                activeView={activeView}
                onNavigate={onNavigate}
                onLogout={onLogout}
                onImpersonate={onImpersonate}
                isCollapsed={collapsed}
                onToggleCollapse={toggleCollapse}
            />
            <main className="flex-1 overflow-y-auto ds-scroll relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
