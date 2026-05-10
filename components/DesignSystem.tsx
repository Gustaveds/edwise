import React, { useState } from 'react';
import {
    Sparkles, ArrowRight, Check, AlertCircle, Info, AlertTriangle,
    Save, Plus, Trash2, Search, ChevronDown, BookOpen, Folder, Video,
    FileText, ClipboardList, Star, User, Settings, Bell
} from 'lucide-react';

const Section: React.FC<{ id: string; title: string; subtitle?: string; children: React.ReactNode }> = ({
    id, title, subtitle, children
}) => (
    <section id={id} className="py-16 border-b border-ink-200/70 last:border-b-0">
        <div className="mb-10">
            <span className="label">{id}</span>
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-ink-900 tracking-tight">{title}</h2>
            {subtitle && <p className="mt-2 text-base text-ink-600 max-w-2xl">{subtitle}</p>}
        </div>
        {children}
    </section>
);

const Swatch: React.FC<{ className: string; name: string; token: string; dark?: boolean }> = ({
    className, name, token, dark
}) => (
    <div>
        <div className={`h-20 rounded-xl border border-ink-200 ${className}`} />
        <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className={`text-sm font-medium ${dark ? 'text-ink-700' : 'text-ink-900'}`}>{name}</span>
            <span className="text-[11px] font-mono text-ink-500">{token}</span>
        </div>
    </div>
);

const DesignSystem: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const [step, setStep] = useState(1);

    return (
        <div className="min-h-screen bg-ink-50 text-ink-900">
            {/* Top nav */}
            <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-ink-200">
                <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="font-display text-lg font-bold tracking-tight text-ink-900">EdWise AI</span>
                        <span className="hidden md:inline text-ink-300">/</span>
                        <span className="hidden md:inline text-sm text-ink-500">Design System</span>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-xs font-medium text-ink-500 uppercase tracking-wider">
                        <a href="#colors" className="hover:text-brand-600 transition-colors">Colors</a>
                        <a href="#typography" className="hover:text-brand-600 transition-colors">Typography</a>
                        <a href="#buttons" className="hover:text-brand-600 transition-colors">Buttons</a>
                        <a href="#inputs" className="hover:text-brand-600 transition-colors">Inputs</a>
                        <a href="#cards" className="hover:text-brand-600 transition-colors">Cards</a>
                        <a href="#feedback" className="hover:text-brand-600 transition-colors">Feedback</a>
                        <a href="#patterns" className="hover:text-brand-600 transition-colors">Patterns</a>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="btn-ghost">
                            Voltar ao app
                        </button>
                    )}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6">
                {/* Hero */}
                <section className="relative py-20 md:py-28">
                    <div className="absolute inset-0 -z-10 bg-brand-glow" />
                    <span className="chip-brand">
                        <Sparkles className="w-3.5 h-3.5" />
                        EdWise Design System v1.0
                    </span>
                    <h1 className="mt-6 font-display font-semibold text-5xl md:text-7xl tracking-tight text-ink-900 leading-[1.05] max-w-4xl">
                        Uma linguagem visual <span className="text-brand-500">limpa</span><br />
                        para uma experiência de estudo <span className="bg-brand-gradient bg-clip-text text-transparent">fluida</span>.
                    </h1>
                    <p className="mt-6 text-lg text-ink-600 max-w-2xl leading-relaxed">
                        Orange como cor principal, neutros slate, tipografia Manrope + Inter. Modo claro por padrão,
                        densidade airy, glass apenas em modais. Foco em legibilidade e navegação para uso diário (18–45).
                    </p>
                    <div className="mt-10 flex flex-wrap gap-4">
                        <button className="btn-primary">
                            Começar agora <ArrowRight className="w-4 h-4" />
                        </button>
                        <button className="btn-secondary">Ver componentes</button>
                    </div>
                </section>

                {/* Colors */}
                <Section id="colors" title="Cores & Superfícies" subtitle="Brand laranja para ações; neutros slate para hierarquia. Gradientes restritos a CTAs e destaques.">
                    <div className="mb-10">
                        <h3 className="font-display font-semibold text-lg text-ink-900 mb-4">Brand · Orange</h3>
                        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-3">
                            {[50,100,200,300,400,500,600,700,800,900,950].map(n => (
                                <Swatch key={n} className={`bg-brand-${n}`} name={`brand-${n}`} token={`#${n}`} dark={n < 400} />
                            ))}
                        </div>
                    </div>

                    <div className="mb-10">
                        <h3 className="font-display font-semibold text-lg text-ink-900 mb-4">Ink · Slate (neutros)</h3>
                        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-3">
                            {[50,100,200,300,400,500,600,700,800,900,950].map(n => (
                                <Swatch key={n} className={`bg-ink-${n}`} name={`ink-${n}`} token={`slate-${n}`} dark={n < 400} />
                            ))}
                        </div>
                    </div>

                    <div className="mb-10">
                        <h3 className="font-display font-semibold text-lg text-ink-900 mb-4">Semânticas</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Swatch className="bg-emerald-500" name="Success" token="emerald-500" />
                            <Swatch className="bg-blue-600" name="Info" token="blue-600" />
                            <Swatch className="bg-amber-500" name="Warning" token="amber-500" />
                            <Swatch className="bg-red-500" name="Danger" token="red-500" />
                        </div>
                    </div>

                    <div>
                        <h3 className="font-display font-semibold text-lg text-ink-900 mb-4">Gradientes & superfícies</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Swatch className="bg-brand-gradient" name="Brand Gradient" token="from-brand-400 to-brand-600" />
                            <Swatch className="bg-brand-gradient-soft" name="Brand Soft" token="from-brand-50 to-white" />
                            <Swatch className="bg-page-light" name="Page" token="from-ink-50 to-white" />
                            <Swatch className="bg-white/60 backdrop-blur-md border-white/60" name="Glass (modal)" token="bg-white/60 + blur" />
                        </div>
                    </div>
                </Section>

                {/* Typography */}
                <Section id="typography" title="Tipografia" subtitle="Manrope para títulos, Inter para corpo, JetBrains Mono para labels e código.">
                    <div className="surface p-8 space-y-8">
                        {[
                            { label: 'Display / H1', cls: 'font-display text-5xl md:text-6xl font-semibold tracking-tight', sample: 'Estude com leveza', token: 'font-display 5xl/6xl semibold' },
                            { label: 'Display / H2', cls: 'font-display text-3xl md:text-4xl font-semibold tracking-tight', sample: 'Seus cursos esta semana', token: 'font-display 3xl/4xl semibold' },
                            { label: 'Heading / H3', cls: 'font-display text-2xl font-semibold', sample: 'Estrutura do Curso', token: 'font-display 2xl semibold' },
                            { label: 'Heading / H4', cls: 'text-lg font-semibold text-ink-900', sample: 'Módulo 1 — Introdução', token: 'text-lg semibold' },
                            { label: 'Body / lg', cls: 'text-lg text-ink-600 leading-relaxed', sample: 'A plataforma EdWise organiza seu aprendizado em módulos, aulas e exercícios práticos.', token: 'text-lg ink-600' },
                            { label: 'Body / base', cls: 'text-base text-ink-700', sample: 'Texto padrão do app, otimizado para leitura prolongada.', token: 'text-base ink-700' },
                            { label: 'Body / sm', cls: 'text-sm text-ink-600', sample: 'Detalhes secundários, descrições de campo.', token: 'text-sm ink-600' },
                            { label: 'Label / Mono', cls: 'text-xs font-mono uppercase tracking-wider text-ink-500', sample: 'Visualizar como', token: 'text-xs font-mono uppercase' },
                        ].map(row => (
                            <div key={row.label} className="grid grid-cols-1 md:grid-cols-[180px_1fr_220px] gap-4 items-baseline pb-6 border-b border-ink-100 last:border-0 last:pb-0">
                                <span className="label !mb-0">{row.label}</span>
                                <p className={row.cls}>{row.sample}</p>
                                <span className="text-xs font-mono text-ink-400 md:text-right">{row.token}</span>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Buttons */}
                <Section id="buttons" title="Botões" subtitle="Primary com gradiente laranja para a ação principal. Secondary e ghost para o resto.">
                    <div className="surface p-8 grid md:grid-cols-2 gap-8">
                        <div>
                            <span className="label">Primary</span>
                            <div className="flex flex-wrap gap-3">
                                <button className="btn-primary">Salvar Curso <Save className="w-4 h-4" /></button>
                                <button className="btn-primary"><Plus className="w-4 h-4" /> Novo Módulo</button>
                                <button className="btn-primary" disabled>Disabled</button>
                            </div>
                        </div>
                        <div>
                            <span className="label">Secondary</span>
                            <div className="flex flex-wrap gap-3">
                                <button className="btn-secondary">Cancelar</button>
                                <button className="btn-secondary"><Search className="w-4 h-4" /> Buscar</button>
                                <button className="btn-secondary"><Settings className="w-4 h-4" /> Ajustes</button>
                            </div>
                        </div>
                        <div>
                            <span className="label">Ghost</span>
                            <div className="flex flex-wrap gap-3">
                                <button className="btn-ghost">Voltar</button>
                                <button className="btn-ghost"><ChevronDown className="w-4 h-4" /> Mais opções</button>
                            </div>
                        </div>
                        <div>
                            <span className="label">Danger</span>
                            <div className="flex flex-wrap gap-3">
                                <button className="btn-danger-ghost"><Trash2 className="w-4 h-4" /> Excluir</button>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Inputs */}
                <Section id="inputs" title="Formulários" subtitle="Inputs com foco laranja sutil; labels em mono para hierarquia clara.">
                    <div className="surface p-8 grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="label">Título do Curso</label>
                            <input className="input" placeholder="Ex: Introdução ao Marketing Digital" />
                        </div>
                        <div>
                            <label className="label">Tipo</label>
                            <select className="input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_1rem_center]">
                                <option>Curso</option>
                                <option>Trilha</option>
                                <option>Módulo</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Descrição</label>
                            <textarea className="input min-h-[120px]" placeholder="Descreva objetivo, público e resultado esperado." />
                        </div>
                    </div>
                </Section>

                {/* Cards */}
                <Section id="cards" title="Cards & Listas" subtitle="Cards rounded-2xl, sombras suaves, hover sutil. Sem ruído visual.">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="surface p-6 hover:shadow-card-hover transition-shadow cursor-pointer group">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center mb-4">
                                <BookOpen className="w-5 h-5 text-brand-600" />
                            </div>
                            <h4 className="font-display font-semibold text-lg text-ink-900">Marketing Digital</h4>
                            <p className="text-sm text-ink-600 mt-1">8 módulos • 24 aulas</p>
                            <div className="mt-4 flex items-center justify-between">
                                <span className="chip-brand">Em andamento</span>
                                <ArrowRight className="w-4 h-4 text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                            </div>
                        </div>

                        <div className="surface p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="label !mb-0">Progresso</span>
                                <span className="text-xs font-mono text-ink-500">62%</span>
                            </div>
                            <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-gradient rounded-full" style={{width: '62%'}} />
                            </div>
                            <p className="mt-4 text-sm text-ink-600">5 de 8 módulos concluídos</p>
                        </div>

                        <div className="rounded-card border border-brand-200 bg-brand-gradient-soft p-6">
                            <div className="flex items-center gap-2 text-brand-700 mb-2">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wider">Premium</span>
                            </div>
                            <h4 className="font-display font-semibold text-lg text-ink-900">Estude no foco</h4>
                            <p className="text-sm text-ink-700 mt-1">Modo cinema com IA tutor.</p>
                            <button className="btn-primary mt-4 w-full justify-center">Ativar</button>
                        </div>
                    </div>
                </Section>

                {/* Feedback */}
                <Section id="feedback" title="Feedback & Estados" subtitle="Mensagens claras, ícones consistentes, cores semânticas.">
                    <div className="space-y-3 max-w-3xl">
                        {[
                            { icon: Check, color: 'emerald', title: 'Curso publicado com sucesso', body: 'Os alunos já podem acessá-lo.' },
                            { icon: Info, color: 'blue', title: 'Conteúdo salvo automaticamente', body: 'Suas alterações estão seguras.' },
                            { icon: AlertTriangle, color: 'amber', title: 'Você ainda não definiu uma descrição', body: 'Recomendamos preencher antes de publicar.' },
                            { icon: AlertCircle, color: 'red', title: 'Falha ao enviar o vídeo', body: 'Verifique sua conexão e tente novamente.' },
                        ].map(a => (
                            <div key={a.title} className={`flex items-start gap-3 rounded-xl border bg-${a.color}-50 border-${a.color}-200 p-4`}>
                                <div className={`w-8 h-8 rounded-lg bg-${a.color}-500 grid place-items-center text-white flex-shrink-0`}>
                                    <a.icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold text-${a.color}-900`}>{a.title}</p>
                                    <p className={`text-sm text-${a.color}-700`}>{a.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Patterns: stepper + content type chips */}
                <Section id="patterns" title="Padrões" subtitle="Stepper para fluxos longos, chips por tipo de conteúdo, navegação clara.">
                    {/* Stepper */}
                    <div className="surface p-8 mb-8">
                        <span className="label">Stepper (CourseEditor)</span>
                        <div className="flex items-center gap-6">
                            {[
                                { n: 1, label: 'Metadados' },
                                { n: 2, label: 'Estrutura' },
                                { n: 3, label: 'Publicação' },
                            ].map((s, idx, arr) => {
                                const state = step === s.n ? 'step-active' : step > s.n ? 'step-done' : '';
                                return (
                                    <React.Fragment key={s.n}>
                                        <button onClick={() => setStep(s.n)} className={`step ${state}`}>
                                            <span className="step-bullet">{step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}</span>
                                            {s.label}
                                        </button>
                                        {idx < arr.length - 1 && <div className="flex-1 h-px bg-ink-200" />}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content type chips */}
                    <div className="surface p-8 mb-8">
                        <span className="label">Tipos de Conteúdo</span>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { icon: Video, label: 'Vídeo', color: 'blue' },
                                { icon: FileText, label: 'Texto', color: 'indigo' },
                                { icon: ClipboardList, label: 'Quiz', color: 'emerald' },
                                { icon: Folder, label: 'Arquivo', color: 'slate' },
                                { icon: Star, label: 'Destaque', color: 'amber' },
                            ].map(c => (
                                <span key={c.label} className={`chip bg-${c.color}-50 text-${c.color}-700 border border-${c.color}-100`}>
                                    <c.icon className="w-3.5 h-3.5" />
                                    {c.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar nav preview */}
                    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
                        <div className="surface p-3">
                            <div className="px-3 py-3 mb-2">
                                <span className="font-display text-base font-bold tracking-tight text-ink-900">EdWise AI</span>
                            </div>
                            {[
                                { icon: BookOpen, label: 'Home', active: true },
                                { icon: Folder, label: 'Meus Cursos' },
                                { icon: Star, label: 'Meus Recursos' },
                                { icon: Bell, label: 'Calendário' },
                                { icon: Settings, label: 'Configurações' },
                            ].map(it => (
                                <button key={it.label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                    it.active
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                                }`}>
                                    <it.icon className="w-4 h-4" />
                                    {it.label}
                                </button>
                            ))}
                        </div>
                        <div className="surface p-8">
                            <span className="label">Conteúdo do app</span>
                            <h3 className="font-display text-2xl font-semibold text-ink-900">Bem-vindo de volta, Thiago</h3>
                            <p className="text-sm text-ink-600 mt-1">Você tem 3 cursos em andamento.</p>
                        </div>
                    </div>
                </Section>
            </main>

            <footer className="max-w-7xl mx-auto px-6 py-10 text-xs font-mono text-ink-500 flex items-center justify-between">
                <span>EdWise Design System · v1.0</span>
                <span>Manrope · Inter · JetBrains Mono</span>
            </footer>
        </div>
    );
};

export default DesignSystem;
