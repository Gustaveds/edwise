import React from 'react';
import { Users, BookOpen, Activity, Shield } from 'lucide-react';

const AdminDashboard: React.FC = () => {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Painel Administrativo</h2>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Visão geral do sistema e gerenciamento de usuários.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200">Usuários Totais</h3>
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">1,234</p>
                    <p className="text-sm text-green-500 mt-2">+12% este mês</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200">Cursos Ativos</h3>
                        <BookOpen className="w-6 h-6 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">42</p>
                    <p className="text-sm text-green-500 mt-2">+3 novos cursos</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200">Atividade do Sistema</h3>
                        <Activity className="w-6 h-6 text-orange-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">98%</p>
                    <p className="text-sm text-gray-500 mt-2">Uptime nos últimos 30 dias</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Usuários Recentes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm">
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Função</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {[
                                { name: 'Admin User', email: 'admin@edwise.com', role: 'Admin', status: 'Ativo' },
                                { name: 'Professor Test', email: 'professor@edwise.ai', role: 'Professor', status: 'Ativo' },
                                { name: 'Student Test', email: 'student@edwise.ai', role: 'Aluno', status: 'Ativo' },
                            ].map((user, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${user.role === 'Admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                user.role === 'Professor' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-green-600 dark:text-green-400 text-sm">{user.status}</td>
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
