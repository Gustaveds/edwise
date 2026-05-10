import React, { useEffect, useMemo, useState } from 'react';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock,
    BookOpen, FileText, Video, ListChecks, Plus, X,
} from 'lucide-react';
import { Course, Material, MaterialType, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ui/Toast';
import { useDialog } from './ui/ConfirmDialog';
import config from '../config';
import Modal from './ui/Modal';

interface CalendarViewProps {
    userRole: UserRole;
}

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    type: 'release' | 'due' | 'custom';
    materialType?: MaterialType;
    courseTitle: string;
    courseId: string | number;
    description?: string;
}

const PERSONAL_KEY = 'edwise.calendar.personal';

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function loadPersonalEvents(): CalendarEvent[] {
    try {
        const raw = localStorage.getItem(PERSONAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Array<Omit<CalendarEvent, 'date'> & { date: string }>;
        return parsed.map(e => ({ ...e, date: new Date(e.date) }));
    } catch {
        return [];
    }
}

function savePersonalEvents(events: CalendarEvent[]) {
    try {
        localStorage.setItem(PERSONAL_KEY, JSON.stringify(events.map(e => ({
            ...e, date: e.date.toISOString(),
        }))));
    } catch { /* ignore */ }
}

function iconForMaterial(type?: MaterialType) {
    switch (type) {
        case MaterialType.Video:      return Video;
        case MaterialType.PDF:
        case MaterialType.Text:       return FileText;
        case MaterialType.Quiz:       return ListChecks;
        default:                      return BookOpen;
    }
}

const CalendarView: React.FC<CalendarViewProps> = () => {
    const { token } = useAuth();
    const toast = useToast();
    const { confirm } = useDialog();

    const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [personal, setPersonal] = useState<CalendarEvent[]>(() => loadPersonalEvents());
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newDescription, setNewDescription] = useState('');

    useEffect(() => { fetchEvents(); }, []);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${config.API_URL}/api/courses`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const courses: Course[] = await res.json();

            const detailed = await Promise.all(
                (courses || []).map(c =>
                    fetch(`${config.API_URL}/api/courses/${c.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                        .then(r => r.json())
                        .catch(() => null)
                )
            );

            const collected: CalendarEvent[] = [];
            detailed.filter(Boolean).forEach((course: any) => {
                const modules = course.modules || [];
                modules.forEach((mod: any) => {
                    (mod.contents || []).forEach((content: Material) => {
                        if (content.release_at) {
                            collected.push({
                                id: `release-${content.id}`,
                                title: content.title,
                                date: new Date(content.release_at),
                                type: 'release',
                                materialType: content.type,
                                courseTitle: course.title,
                                courseId: course.id,
                                description: 'Liberação de conteúdo',
                            });
                        }
                        const due = (content as any).settings?.due_date;
                        if (due) {
                            collected.push({
                                id: `due-${content.id}`,
                                title: content.title,
                                date: new Date(due),
                                type: 'due',
                                materialType: content.type,
                                courseTitle: course.title,
                                courseId: course.id,
                                description: 'Prazo de entrega',
                            });
                        }
                    });
                });
            });

            setEvents(collected);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar calendário');
        } finally {
            setIsLoading(false);
        }
    };

    const allEvents = useMemo(() => [...events, ...personal], [events, personal]);

    const grid = useMemo(() => {
        const first = startOfMonth(cursor);
        const last = endOfMonth(cursor);
        const startWeekday = first.getDay();
        const cells: Array<Date | null> = [];
        for (let i = 0; i < startWeekday; i++) cells.push(null);
        for (let d = 1; d <= last.getDate(); d++) {
            cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
        }
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [cursor]);

    const eventsByDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        allEvents.forEach(e => {
            const key = `${e.date.getFullYear()}-${e.date.getMonth()}-${e.date.getDate()}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(e);
        });
        return map;
    }, [allEvents]);

    const eventsForDay = (d: Date) => {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        return eventsByDay.get(key) || [];
    };

    const upcoming = useMemo(() => {
        const now = new Date();
        return allEvents
            .filter(e => e.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 6);
    }, [allEvents]);

    const today = new Date();

    const goPrev   = () => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    const goNext   = () => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    const goToday  = () => { const t = new Date(); setCursor(startOfMonth(t)); setSelectedDay(t); };

    const openAddModal = (preset?: Date) => {
        const d = preset || selectedDay || new Date();
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setNewDate(iso);
        setNewTitle('');
        setNewDescription('');
        setShowAddModal(true);
    };

    const submitNewEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newDate) return;
        const ev: CalendarEvent = {
            id: `personal-${Date.now()}`,
            title: newTitle.trim(),
            date: new Date(newDate + 'T12:00:00'),
            type: 'custom',
            courseTitle: 'Pessoal',
            courseId: 'personal',
            description: newDescription.trim() || undefined,
        };
        const next = [...personal, ev];
        setPersonal(next);
        savePersonalEvents(next);
        setShowAddModal(false);
        toast.success('Evento adicionado');
    };

    const removePersonal = async (id: string) => {
        const ok = await confirm({
            title: 'Remover este evento?',
            message: 'A ação não pode ser desfeita.',
            confirmLabel: 'Remover',
            tone: 'danger',
        });
        if (!ok) return;
        const next = personal.filter(e => e.id !== id);
        setPersonal(next);
        savePersonalEvents(next);
        toast.success('Evento removido');
    };

    const dayEvents = selectedDay ? eventsForDay(selectedDay) : [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="label">Agenda</span>
                    <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-ink-900">
                        Calendário
                    </h2>
                    <p className="mt-2 text-base text-ink-600">
                        Liberações de conteúdo, prazos de entrega e eventos pessoais.
                    </p>
                </div>
                <button onClick={() => openAddModal()} className="btn-primary">
                    <Plus className="w-4 h-4" /> Novo Evento
                </button>
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                    <button onClick={goPrev} className="p-2 rounded-lg hover:bg-ink-100 text-ink-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-display text-xl font-semibold text-ink-900 min-w-[200px] text-center">
                        {monthNames[cursor.getMonth()]} {cursor.getFullYear()}
                    </h3>
                    <button onClick={goNext} className="p-2 rounded-lg hover:bg-ink-100 text-ink-600">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                <button onClick={goToday} className="btn-ghost !px-4 !py-2 text-sm">
                    <CalendarIcon className="w-4 h-4" /> Hoje
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* Calendar grid */}
                <div className="surface overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-ink-200">
                        {dayNames.map(d => (
                            <div key={d} className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-500 text-center">
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {isLoading ? (
                            Array.from({ length: 35 }).map((_, i) => (
                                <div key={i} className="h-24 border-r border-b border-ink-100 bg-ink-50/40 animate-pulse" />
                            ))
                        ) : (
                            grid.map((d, i) => {
                                if (!d) return <div key={i} className="h-24 border-r border-b border-ink-100 bg-ink-50/30" />;
                                const evs = eventsForDay(d);
                                const isToday = isSameDay(d, today);
                                const isSelected = selectedDay && isSameDay(d, selectedDay);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDay(d)}
                                        className={`h-24 border-r border-b border-ink-100 p-2 text-left flex flex-col gap-1 transition-colors
                                            ${isSelected ? 'bg-brand-50' : 'hover:bg-ink-50'}`}
                                    >
                                        <span className={`inline-grid place-items-center w-6 h-6 rounded-full text-xs font-medium
                                            ${isToday ? 'bg-brand-500 text-white' : 'text-ink-700'}`}>
                                            {d.getDate()}
                                        </span>
                                        <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                                            {evs.slice(0, 2).map(e => (
                                                <div
                                                    key={e.id}
                                                    className={`truncate text-[10px] px-1.5 py-0.5 rounded font-medium
                                                        ${e.type === 'due' ? 'bg-red-100 text-red-700'
                                                            : e.type === 'release' ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-blue-100 text-blue-700'}`}
                                                >
                                                    {e.title}
                                                </div>
                                            ))}
                                            {evs.length > 2 && (
                                                <div className="text-[10px] text-ink-500 px-1">
                                                    +{evs.length - 2} mais
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Side panel */}
                <div className="space-y-6">
                    {selectedDay && (
                        <div className="surface p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="label">Selecionado</span>
                                    <h4 className="font-display font-semibold text-ink-900">
                                        {selectedDay.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h4>
                                </div>
                                <button onClick={() => openAddModal(selectedDay)} className="btn-ghost !p-2" title="Adicionar evento">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {dayEvents.length === 0 ? (
                                <p className="text-sm text-ink-500 text-center py-4">Nenhum evento neste dia.</p>
                            ) : (
                                <div className="space-y-2">
                                    {dayEvents.map(e => {
                                        const Icon = iconForMaterial(e.materialType);
                                        return (
                                            <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg bg-ink-50">
                                                <div className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0
                                                    ${e.type === 'due' ? 'bg-red-100 text-red-700'
                                                        : e.type === 'release' ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-blue-100 text-blue-700'}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-ink-900 truncate">{e.title}</p>
                                                    <p className="text-xs text-ink-500 truncate">
                                                        {e.courseTitle} {e.description ? `• ${e.description}` : ''}
                                                    </p>
                                                </div>
                                                {e.type === 'custom' && (
                                                    <button
                                                        onClick={() => removePersonal(e.id)}
                                                        className="p-1 rounded text-ink-400 hover:text-red-600 hover:bg-red-50"
                                                        title="Remover"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="surface p-5">
                        <span className="label">Próximos</span>
                        <h4 className="font-display font-semibold text-ink-900 mb-3">Eventos a seguir</h4>
                        {upcoming.length === 0 ? (
                            <p className="text-sm text-ink-500 text-center py-3">
                                Nenhum evento futuro.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {upcoming.map(e => (
                                    <button
                                        key={e.id}
                                        onClick={() => { setCursor(startOfMonth(e.date)); setSelectedDay(e.date); }}
                                        className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-ink-50 text-left transition-colors"
                                    >
                                        <div className="flex flex-col items-center w-10 flex-shrink-0">
                                            <span className="text-[10px] uppercase tracking-wider text-ink-500">
                                                {monthNames[e.date.getMonth()].slice(0, 3)}
                                            </span>
                                            <span className="text-lg font-display font-semibold text-ink-900 leading-none">
                                                {e.date.getDate()}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-ink-900 truncate">{e.title}</p>
                                            <p className="text-xs text-ink-500 truncate flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {e.courseTitle}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add event modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Novo evento"
                description="Adicione um lembrete ao seu calendário pessoal."
                size="md"
            >
                <form onSubmit={submitNewEvent} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1.5">Título</label>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            placeholder="Ex.: Estudar capítulo 3"
                            required
                            className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink-200 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1.5">Data</label>
                        <input
                            type="date"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink-200 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink-700 mb-1.5">
                            Descrição <span className="text-ink-400 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            value={newDescription}
                            onChange={e => setNewDescription(e.target.value)}
                            rows={3}
                            placeholder="Detalhes do evento..."
                            className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink-200 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-300 resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary">
                            <Plus className="w-4 h-4" /> Adicionar
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CalendarView;
