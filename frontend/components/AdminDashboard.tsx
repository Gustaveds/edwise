import React from 'react';
import { Users, BookOpen, Activity, TrendingUp, Shield } from 'lucide-react';

const StatCard: React.FC<{
    label: string;
    value: string;
    delta?: string;
    deltaTone?: 'positive' | 'neutral';
    icon: any;
    accent: string; // tailwind color class for icon bg
}> = ({ label, value, delta, deltaTone = 'positive', icon: Icon, accent }) => (
    <div className="surface p-6">
        <div className="flex items-start justify-between mb-4">
            <span className="text-sm font-medium text-ink-600">{label}</span>
            <div className={`w-10 h-10 rounded-xl grid place-items-center ${accent}`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
        <p className="font-display text-3xl font-semibold text-ink-900">{value}</p>
        {delta && (
            <p className={`text-xs mt-2 inline-flex items-center gap-1 ${deltaTone === 'positive' ? 'text-emerald-600' : 'text-ink-500'}`}>
                {deltaTone === 'positive' && <TrendingUp className="w-3 h-3" />}
                {delta}
            </p>
        )}
    </div>
);

const AdminDashboard: React.FC = () => {
    const users = [
        { name: 'Admin User',     email: 'admin@edwise.com',     role: 'Admin',     status: 'Ativo' },
        { name: 'Professor Test', email: 'professor@edwise.ai', role: 'Professor', status: 'Ativo' },
        { name: 'Student Test',   email: 'student@edwise.ai',   role: 'Aluno',     status: 'Ativo' },
    ];

    const roleChip = (role: string) => {
        const map: Record<string, string> = {
            Admin:     'bg-red-50 text-red-700 ring-1 ring-red-100',
            Professor: 'bg-purple-50 text-purple-700 ring-1 ring-purple-100',
            Aluno:     'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
        };
        return map[role] || 'bg-ink-100 text-ink-700';
    };

    return (
        <div className="space-y-8">
            <div>
                <span className="label">Administração</span>
                <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                    Painel Administrativo
                </h2>
                <p className="mt-2 text-base text-ink-600">
                    Visão geral do sistema e gerenciamento de usuários.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Usuários Totais"      value="1.234" delta="+12% este mês"        icon={Users}    accent="bg-blue-50 text-blue-600" />
                <StatCard label="Cursos Ativos"        value="42"    delta="+3 novos cursos"      icon={BookOpen} accent="bg-brand-50 text-brand-600" />
                <StatCard label="Atividade do Sistema" value="98%"   delta="Uptime últimos 30 dias" deltaTone="neutral" icon={Activity} accent="bg-emerald-50 text-emerald-600" />
            </div>

            <div className="surface overflow-hidden">
                <div className="px-6 py-5 border-b border-ink-200 flex items-center justify-between">
                    <div>
                        <h3 className="font-display font-semibold text-lg text-ink-900">Usuários Recentes</h3>
                        <p className="text-xs text-ink-500 mt-0.5">{users.length} usuários cadastrados</p>
                    </div>
                    <button className="btn-secondary !py-1.5 !px-3 text-xs">
                        <Shield className="w-3.5 h-3.5" /> Gerenciar
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-xs font-mono uppercase tracking-wider text-ink-500 bg-ink-50">
                                <th className="px-6 py-3 font-medium">Nome</th>
                                <th className="px-6 py-3 font-medium">Email</th>
                                <th className="px-6 py-3 font-medium">Função</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-100">
                            {users.map((user, i) => (
                                <tr key={i} className="hover:bg-ink-50/60 transition-colors">
                                    <td className="px-6 py-4 font-medium text-ink-900">{user.name}</td>
                                    <td className="px-6 py-4 text-ink-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${roleChip(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                            </span>
                                            {user.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
