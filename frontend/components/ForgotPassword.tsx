import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

interface ForgotPasswordProps {
    onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-ink-50 flex flex-col justify-center items-center p-6 sm:p-8">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">EdWise AI</h1>
                </div>

                {isSubmitted ? (
                    <div className="surface p-8 text-center">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 grid place-items-center mb-4">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h2 className="font-display text-2xl font-semibold text-ink-900 mb-2">Verifique seu e-mail</h2>
                        <p className="text-ink-600">
                            Se uma conta com o e-mail fornecido existir, enviamos um link para redefinir sua senha.
                        </p>
                    </div>
                ) : (
                    <>
                        <span className="label">Recuperação</span>
                        <h2 className="font-display text-3xl font-semibold text-ink-900 mb-1">
                            Esqueceu sua senha?
                        </h2>
                        <p className="text-ink-600 mb-8">
                            Sem problemas. Digite seu e-mail e enviaremos as instruções.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
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

                            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando link...
                                    </>
                                ) : 'Enviar link de redefinição'}
                            </button>
                        </form>
                    </>
                )}

                <div className="mt-8 text-center">
                    <button
                        onClick={onBackToLogin}
                        className="btn-ghost mx-auto"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar para o login
                    </button>
                </div>

                <p className="text-center text-xs font-mono text-ink-500 mt-10">
                    EdWise AI © {new Date().getFullYear()} · Todos os direitos reservados
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
