import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { HelpCircle, MessageSquare, TrendingUp, AlertCircle, ThumbsUp, ThumbsDown, MessageSquareQuote } from 'lucide-react';
import { useAnalytics } from '../contexts/AnalyticsContext';
import config from '../config';

const engagementData = [
    { name: 'Semana 1', interactions: 400 },
    { name: 'Semana 2', interactions: 300 },
    { name: 'Semana 3', interactions: 600 },
    { name: 'Semana 4', interactions: 800 },
];

const commonQuestionsData = [
    { topic: 'Tipos de Dados', count: 120 },
    { topic: 'Laços', count: 98 },
    { topic: 'Funções', count: 75 },
    { topic: 'Classes', count: 50 },
    { topic: 'Módulos', count: 30 },
];

const topicDifficultyData = [
    { name: 'Tipos de Dados', difficulty: 20 },
    { name: 'Laços', difficulty: 45 },
    { name: 'Funções', difficulty: 30 },
    { name: 'Classes', difficulty: 65 },
    { name: 'Módulos', difficulty: 15 },
];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

const criticalQuestionsData = [
    { question: 'Como configuro o ambiente de desenvolvimento para o projeto final?', count: 25 },
    { question: 'Qual a diferença entre "let", "const" e "var" em JavaScript?', count: 18 },
    { question: 'Onde encontro a documentação da API externa mencionada na aula 3?', count: 15 },
    { question: 'Como depurar loops infinitos em Python de forma eficiente?', count: 12 },
    { question: 'Existem exemplos de código para a implementação de árvores binárias?', count: 9 },
];

const staticStudentFeedbackData = [
    {
        id: 1,
        type: 'negative',
        message: 'A complexidade de tempo de uma busca binária é O(log n) porque você divide o problema pela metade a cada iteração.',
        feedbackText: 'A explicação foi um pouco confusa. Poderia ser mais simples?',
        topic: 'Estruturas de Dados',
    },
    {
        id: 2,
        type: 'positive',
        message: 'Claro! Aqui está um exemplo de uma função Python simples: `def hello(): print("Olá, Mundo!")`',
        feedbackText: 'Exemplo claro, obrigado!',
        topic: 'Introdução ao Python',
    },
    {
        id: 3,
        type: 'positive',
        message: 'Gerei um quiz para você! Por favor, responda às perguntas abaixo.',
        feedbackText: null,
        topic: 'Introdução ao Python',
    },
    {
        id: 4,
        type: 'negative',
        message: 'Desculpe, não consegui encontrar uma resposta para isso no material do curso fornecido.',
        feedbackText: 'A resposta estava no PDF da semana 2, página 5. A IA deveria ter encontrado.',
        topic: 'Estruturas de Dados',
    }
];


const AnalyticsDashboard: React.FC = () => {
    const { state } = useAnalytics();
    const [stats, setStats] = React.useState({
        totalQuizzes: 0,
        averageScore: 0,
        difficultTopics: [] as { name: string, difficulty: number }[]
    });

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${config.API_URL}/api/professor/stats`);
                const data = await response.json();
                setStats(data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };
        fetchStats();
    }, []);

    const totalInteractions = state.interactions.length;

    const feedbackData = useMemo(() => {
        if (state.feedbacks.length === 0) {
            return staticStudentFeedbackData;
        }

        return state.feedbacks.map((item) => ({
            id: item.id,
            type: item.type,
            message: item.message,
            feedbackText: item.feedbackText ?? null,
            topic: item.courseTitle,
        }));
    }, [state.feedbacks]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center space-x-4">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full"><MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total de Interações</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {totalInteractions}
                        </p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center space-x-4">
                    <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full"><TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" /></div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Quizzes concluídos</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {stats.totalQuizzes}
                        </p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center space-x-4">
                    <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-full"><HelpCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" /></div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Média de Notas</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.averageScore.toFixed(1)}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center space-x-4">
                    <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full"><AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tópico Mais Difícil</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            {stats.difficultTopics.length > 0 ? stats.difficultTopics[0].name : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Engajamento Semanal</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={engagementData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.2)" />
                            <XAxis dataKey="name" tick={{ fill: 'rgb(156 163 175)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'rgb(156 163 175)', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4b5563', borderRadius: '0.5rem' }} />
                            <Bar dataKey="interactions" fill="#3B82F6" barSize={30} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Dúvidas Mais Comuns por Tópico</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={commonQuestionsData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="count"
                                nameKey="topic"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {commonQuestionsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: '1px solid #4b5563', borderRadius: '0.5rem' }} />
                            <Legend wrapperStyle={{ color: 'rgb(156 163 175)' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Pontuação de Dificuldade do Tópico</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Baseado na porcentagem de respostas incorretas nos quizzes gerados por IA.</p>
                <div className="space-y-4">
                    {topicDifficultyData.sort((a, b) => b.difficulty - a.difficulty).map(topic => (
                        <div key={topic.name}>
                            <div className="flex justify-between mb-1">
                                <span className="text-base font-medium text-gray-700 dark:text-gray-300">{topic.name}</span>
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{topic.difficulty}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${topic.difficulty}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100 flex items-center">
                    <AlertCircle className="w-6 h-6 mr-3 text-red-500" />
                    Análise de Dúvidas Críticas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Principais perguntas que a IA não conseguiu responder. Isso pode indicar lacunas no material do curso.
                </p>
                <div className="space-y-4">
                    {criticalQuestionsData.map((item, index) => (
                        <div key={index} className="flex items-start justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                            <div className="flex items-start">
                                <HelpCircle className="w-5 h-5 mr-3 mt-1 text-red-400 flex-shrink-0" />
                                <p className="text-gray-700 dark:text-gray-300">{item.question}</p>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-200 dark:bg-red-300 text-red-800">
                                    {item.count} vezes
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100 flex items-center">
                    <MessageSquareQuote className="w-6 h-6 mr-3 text-purple-500" />
                    Relatório de Feedback dos Alunos
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Analise as interações dos alunos com o assistente de IA para entender a eficácia das respostas e identificar áreas de melhoria.
                </p>
                <div className="space-y-4">
                    {feedbackData.map((item) => (
                        <div key={item.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center mb-2">
                                        {item.type === 'positive' ? (
                                            <ThumbsUp className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <ThumbsDown className="w-5 h-5 mr-2 text-red-500 flex-shrink-0" />
                                        )}
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Resposta da IA: "{item.message}"</p>
                                    </div>
                                    {item.feedbackText && (
                                        <div className="mt-2 pl-7">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Feedback do Aluno:</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded-md">{item.feedbackText}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="ml-4 flex-shrink-0">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-200 text-purple-800">
                                        {item.topic}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;

