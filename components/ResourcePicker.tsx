import React from 'react';
import { Video, FileText, ClipboardList, Upload, Link as LinkIcon, File, ArrowRight } from 'lucide-react';
import { MaterialType } from '../types';
import Modal from './ui/Modal';

interface ResourcePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: MaterialType) => void;
}

const resources = [
    { type: MaterialType.Video,      label: 'Vídeo Aula',     description: 'Adicione um vídeo do YouTube, Vimeo ou upload direto.', icon: Video,         accent: 'bg-blue-50 text-blue-600' },
    { type: MaterialType.Text,       label: 'Artigo / Texto', description: 'Escreva uma aula em texto rico com imagens e formatação.', icon: FileText,    accent: 'bg-indigo-50 text-indigo-600' },
    { type: MaterialType.Quiz,       label: 'Quiz',           description: 'Crie perguntas de múltipla escolha para avaliar o aluno.', icon: ClipboardList, accent: 'bg-emerald-50 text-emerald-600' },
    { type: MaterialType.Assignment, label: 'Tarefa',         description: 'Peça para o aluno enviar um arquivo ou texto.',          icon: Upload,        accent: 'bg-purple-50 text-purple-600' },
    { type: MaterialType.Link,       label: 'Link Externo',   description: 'Incorpore conteúdo de outros sites (embed).',           icon: LinkIcon,      accent: 'bg-amber-50 text-amber-600' },
    { type: MaterialType.File,       label: 'Arquivo',        description: 'Disponibilize PDFs, planilhas ou zips para download.',  icon: File,          accent: 'bg-ink-100 text-ink-700' },
];

const ResourcePicker: React.FC<ResourcePickerProps> = ({ isOpen, onClose, onSelect }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title="Adicionar conteúdo"
            description="Escolha o tipo de aula que deseja adicionar a este módulo."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resources.map((resource) => {
                    const Icon = resource.icon;
                    return (
                        <button
                            key={resource.type}
                            onClick={() => onSelect(resource.type)}
                            className="group flex items-start gap-4 p-4 rounded-xl border border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-card transition-all text-left"
                        >
                            <div className={`w-11 h-11 rounded-xl grid place-items-center ${resource.accent} group-hover:scale-105 transition-transform flex-shrink-0`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-display font-semibold text-ink-900 group-hover:text-brand-700 transition-colors">
                                        {resource.label}
                                    </h3>
                                    <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                </div>
                                <p className="text-xs text-ink-600 leading-snug mt-1">
                                    {resource.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </Modal>
    );
};

export default ResourcePicker;
