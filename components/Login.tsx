import React, { useState } from 'react';
import { Mail, Lock, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import config from '../config';

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
            const response = await fetch(`${config.API_URL}/api/login`, {
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
        <div className="min-h-screen flex items-stretch text-ink-900 bg-ink-50">
            {/* Brand panel */}
            <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 text-white">
                <div className="absolute inset-0 bg-brand-glow opacity-80" />
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-700/20 rounded-full blur-3xl" />

                <div className="relative z-10 w-full max-w-md">
                    <div className="chip bg-white/10 text-white/80 ring-1 ring-white/15 backdrop-blur-sm mb-8">
                        <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                        Plataforma de aprendizado com IA
                    </div>
                    <h1 className="font-display text-5xl font-semibold tracking-tight leading-[1.05] mb-6">
                        Estude com <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">leveza</span>.<br />
                        Ensine com clareza.
                    </h1>
                    <p className="text-base text-ink-300 leading-relaxed">
                        O assistente que conhece sua instituição, seus cursos e o jeito que você ensina.
                    </p>

                    <div className="mt-12 grid grid-cols-3 gap-4 text-sm text-ink-300">
                        <div>
                            <p className="font-display text-2xl font-semibold text-white">+10k</p>
                            <p className="text-xs uppercase tracking-wider mt-1">Alunos</p>
                        </div>
                        <div>
                            <p className="font-display text-2xl font-semibold text-white">200+</p>
                            <p className="text-xs uppercase tracking-wider mt-1">Cursos</p>
                        </div>
                        <div>
                            <p className="font-display text-2xl font-semibold text-white">98%</p>
                            <p className="text-xs uppercase tracking-wider mt-1">Conclusão</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <div className="max-w-md w-full">
                    <div className="lg:hidden mb-8 text-center">
                        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">EdWise AI</h1>
                    </div>

                    <span className="label">Acesso</span>
                    <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-900 mb-1">
                        Bem-vindo(a) de volta
                    </h2>
                    <p className="text-ink-600 mb-8">
                        Faça login para continuar para o seu painel.
                    </p>

                    {error && (
                        <div className="mb-5 flex items-start gap-3 rounded-xl ring-1 ring-red-200 bg-red-50 p-4 text-sm text-red-800">
                            <span className="font-semibold">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="label">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input pl-10"
                                    placeholder="voce@exemplo.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="label">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pl-10"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-ink-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500/30"
                                />
                                Lembrar de mim
                            </label>
                            <button
                                type="button"
                                onClick={onForgotPasswordClick}
                                className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                            >
                                Esqueceu sua senha?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full justify-center py-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Entrando...
                                </>
                            ) : 'Entrar'}
                        </button>
                    </form>

                    <p className="text-center text-xs font-mono text-ink-500 mt-10">
                        EdWise AI © {new Date().getFullYear()} · Todos os direitos reservados
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
