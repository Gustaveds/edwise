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
    { topic: 'Laços',          count: 98 },
    { topic: 'Funções',        count: 75 },
    { topic: 'Classes',        count: 50 },
    { topic: 'Módulos',        count: 30 },
];

const topicDifficultyData = [
    { name: 'Tipos de Dados', difficulty: 20 },
    { name: 'Laços',          difficulty: 45 },
    { name: 'Funções',        difficulty: 30 },
    { name: 'Classes',        difficulty: 65 },
    { name: 'Módulos',        difficulty: 15 },
];
// Brand-aligned chart palette: warm orange + neutrals + a few accents.
const COLORS = ['#f97316', '#0ea5e9', '#10b981', '#a855f7', '#f59e0b'];

const criticalQuestionsData = [
    { question: 'Como configuro o ambiente de desenvolvimento para o projeto final?',     count: 25 },
    { question: 'Qual a diferença entre "let", "const" e "var" em JavaScript?',           count: 18 },
    { question: 'Onde encontro a documentação da API externa mencionada na aula 3?',      count: 15 },
    { question: 'Como depurar loops infinitos em Python de forma eficiente?',             count: 12 },
    { question: 'Existem exemplos de código para a implementação de árvores binárias?',   count: 9 },
];

const staticStudentFeedbackData = [
    { id: 1, type: 'negative', message: 'A complexidade de tempo de uma busca binária é O(log n) porque você divide o problema pela metade a cada iteração.', feedbackText: 'A explicação foi um pouco confusa. Poderia ser mais simples?', topic: 'Estruturas de Dados' },
    { id: 2, type: 'positive', message: 'Claro! Aqui está um exemplo de uma função Python simples: `def hello(): print("Olá, Mundo!")`', feedbackText: 'Exemplo claro, obrigado!', topic: 'Introdução ao Python' },
    { id: 3, type: 'positive', message: 'Gerei um quiz para você! Por favor, responda às perguntas abaixo.', feedbackText: null, topic: 'Introdução ao Python' },
    { id: 4, type: 'negative', message: 'Desculpe, não consegui encontrar uma resposta para isso no material do curso fornecido.', feedbackText: 'A resposta estava no PDF da semana 2, página 5. A IA deveria ter encontrado.', topic: 'Estruturas de Dados' },
];

const StatCard: React.FC<{ icon: any; label: string; value: string | number; accent: string }> = ({ icon: Icon, label, value, accent }) => (
    <div className="surface p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0 ${accent}`}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
            <p className="text-xs font-mono uppercase tracking-wider text-ink-500">{label}</p>
            <p className="font-display text-2xl font-semibold text-ink-900 truncate">{value}</p>
        </div>
    </div>
);

const AnalyticsDashboard: React.FC = () => {
    const { state } = useAnalytics();
    const [stats, setStats] = React.useState({
        totalQuizzes: 0,
        averageScore: 0,
        difficultTopics: [] as { name: string, difficulty: number }[],
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
        if (state.feedbacks.length === 0) return staticStudentFeedbackData;
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
            <div>
                <span className="label">Insights</span>
                <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                    Analytics
                </h2>
                <p className="mt-2 text-base text-ink-600">
                    Engajamento, desempenho e feedback dos alunos.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={MessageSquare} label="Interações"      value={totalInteractions}              accent="bg-blue-50 text-blue-600" />
                <StatCard icon={TrendingUp}    label="Quizzes"         value={stats.totalQuizzes}             accent="bg-emerald-50 text-emerald-600" />
                <StatCard icon={HelpCircle}    label="Média de notas"  value={stats.averageScore.toFixed(1)}  accent="bg-brand-50 text-brand-600" />
                <StatCard icon={AlertCircle}   label="Tópico difícil"  value={stats.difficultTopics[0]?.name || 'N/A'} accent="bg-red-50 text-red-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="surface p-6">
                    <h3 className="font-display text-lg font-semibold text-ink-900 mb-4">Engajamento semanal</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={engagementData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15,23,42,0.06)" />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: 12 }} />
                            <Bar dataKey="interactions" fill="#f97316" barSize={32} radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="surface p-6">
                    <h3 className="font-display text-lg font-semibold text-ink-900 mb-4">Dúvidas mais comuns por tópico</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={commonQuestionsData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={95}
                                dataKey="count"
                                nameKey="topic"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {commonQuestionsData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: 12 }} />
                            <Legend wrapperStyle={{ color: '#64748b', fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="surface p-6">
                <h3 className="font-display text-lg font-semibold text-ink-900 mb-1">Pontuação de dificuldade do tópico</h3>
                <p className="text-sm text-ink-600 mb-5">Baseado na porcentagem de respostas incorretas nos quizzes gerados por IA.</p>
                <div className="space-y-4">
                    {topicDifficultyData.sort((a, b) => b.difficulty - a.difficulty).map(topic => (
                        <div key={topic.name}>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-ink-800">{topic.name}</span>
                                <span className="text-sm font-mono text-brand-600">{topic.difficulty}%</span>
                            </div>
                            <div className="w-full bg-ink-100 rounded-full h-1.5">
                                <div className="bg-brand-gradient h-1.5 rounded-full" style={{ width: `${topic.difficulty}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="surface p-6">
                <h3 className="font-display text-lg font-semibold text-ink-900 mb-1 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Análise de dúvidas críticas
                </h3>
                <p className="text-sm text-ink-600 mb-5">
                    Principais perguntas que a IA não conseguiu responder. Pode indicar lacunas no material do curso.
                </p>
                <div className="space-y-2">
                    {criticalQuestionsData.map((item, index) => (
                        <div key={index} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-red-50/60 ring-1 ring-red-100 hover:bg-red-50 transition-colors">
                            <div className="flex items-start gap-3 min-w-0">
                                <HelpCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-ink-800">{item.question}</p>
                            </div>
                            <span className="chip bg-red-100 text-red-700 flex-shrink-0">{item.count} vezes</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="surface p-6">
                <h3 className="font-display text-lg font-semibold text-ink-900 mb-1 flex items-center gap-2">
                    <MessageSquareQuote className="w-4 h-4 text-brand-500" />
                    Relatório de feedback dos alunos
                </h3>
                <p className="text-sm text-ink-600 mb-5">
                    Analise as interações dos alunos com o assistente de IA para entender a eficácia das respostas e identificar áreas de melhoria.
                </p>
                <div className="space-y-3">
                    {feedbackData.map((item) => (
                        <div key={item.id} className="p-4 rounded-xl ring-1 ring-ink-200 bg-white">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2 mb-2">
                                        {item.type === 'positive' ? (
                                            <ThumbsUp className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <ThumbsDown className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                        )}
                                        <p className="text-sm text-ink-600 italic">"{item.message}"</p>
                                    </div>
                                    {item.feedbackText && (
                                        <div className="mt-2 pl-6">
                                            <p className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-1">Feedback do aluno</p>
                                            <p className="text-sm text-ink-800 bg-ink-50 p-2.5 rounded-lg">{item.feedbackText}</p>
                                        </div>
                                    )}
                                </div>
                                <span className="chip bg-purple-50 text-purple-700 ring-1 ring-purple-100 flex-shrink-0">{item.topic}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
