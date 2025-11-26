import React, { useState } from 'react';
import { BookOpen, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

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
        // Simulate network request to send reset link
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col justify-center items-center p-8">
            <div className="max-w-md w-full">
                 <div className="flex items-center justify-center space-x-3 mb-8">
                    <div className="bg-blue-800 p-2 rounded-lg">
                        <BookOpen className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-blue-800 dark:text-gray-100">Plataforma EdWise AI</h1>
                </div>

                <div className="w-full">
                    {isSubmitted ? (
                        <div className="text-center bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Verifique seu E-mail</h2>
                            <p className="text-gray-600 dark:text-gray-300">
                                Se uma conta com o e-mail fornecido existir, enviamos um link para redefinir sua senha.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">Esqueceu sua Senha?</h2>
                            <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Sem problemas! Digite seu e-mail e enviaremos as instruções.</p>
                            
                            <form onSubmit={handleSubmit} className="space-y-6">
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
                                                Enviando Link...
                                            </>
                                        ) : (
                                            'Enviar Link de Redefinição'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                     <div className="mt-8 text-center">
                        <button
                            onClick={onBackToLogin}
                            className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500 flex items-center justify-center mx-auto transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar para o Login
                        </button>
                    </div>
                </div>

                <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-10">
                    EdWise AI © {new Date().getFullYear()} - Todos os direitos reservados
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
