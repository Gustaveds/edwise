import React, { useState } from 'react';
import { BookOpen, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
    onLogin: () => void;
    onForgotPasswordClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onForgotPasswordClick }) => {
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error('Falha no login. Verifique suas credenciais.');
            }

            const data = await response.json();
            login(data.token, data.user);
            onLogin();
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao tentar fazer login.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-stretch text-gray-800 bg-white dark:bg-gray-900">
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-700 to-blue-900 items-center justify-center p-12 text-white relative overflow-hidden">
                <div className="z-10 w-full">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                            <BookOpen className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold">EdWise AI</h1>
                    </div>
                    <p className="text-lg text-blue-100 max-w-md">
                        O único assistente de IA que realmente conhece sua instituição e seu conteúdo.
                    </p>
                </div>
                {/* Background decorative shapes */}
                <div className="absolute top-0 -left-1/4 w-96 h-96 bg-white/10 rounded-full mix-blend-screen filter blur-xl opacity-70 animate-pulse"></div>
                <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-white/10 rounded-full mix-blend-screen filter blur-xl opacity-70 animate-pulse delay-75"></div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="max-w-md w-full">
                    <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
                        <div className="bg-blue-800 p-2 rounded-lg">
                            <BookOpen className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-blue-800">EdWise AI</h1>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Bem-vindo(a) de volta!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Faça login para continuar para o seu painel.</p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Endereço de E-mail</label>
                            <div className="relative mt-2">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder-gray-400"
                                    placeholder="voce@exemplo.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Senha</label>
                            <div className="relative mt-2">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder-gray-400"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded" />
                                <label htmlFor="remember-me" className="ml-2 block text-gray-900 dark:text-gray-200">Lembrar de mim</label>
                            </div>
                            <button
                                type="button"
                                onClick={onForgotPasswordClick}
                                className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500"
                            >
                                Esqueceu sua senha?
                            </button>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373,0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Entrando...
                                    </>
                                ) : (
                                    'Entrar'
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-10">
                        EdWise AI © {new Date().getFullYear()} - Todos os direitos reservados
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
