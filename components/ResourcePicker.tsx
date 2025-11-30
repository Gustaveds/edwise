import React from 'react';
import { Video, FileText, ClipboardList, Upload, X, Link as LinkIcon, File } from 'lucide-react';
import { MaterialType } from '../types';

interface ResourcePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: MaterialType) => void;
}

const ResourcePicker: React.FC<ResourcePickerProps> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    const resources = [
        {
            type: MaterialType.Video,
            label: 'Vídeo Aula',
            description: 'Adicione um vídeo do YouTube, Vimeo ou upload direto.',
            icon: Video,
            color: 'bg-red-100 text-red-600'
        },
        {
            type: MaterialType.Text,
            label: 'Artigo / Texto',
            description: 'Escreva uma aula em texto rico com imagens e formatação.',
            icon: FileText,
            color: 'bg-blue-100 text-blue-600'
        },
        {
            type: MaterialType.Quiz,
            label: 'Quiz',
            description: 'Crie perguntas de múltipla escolha para avaliar o aluno.',
            icon: ClipboardList,
            color: 'bg-green-100 text-green-600'
        },
        {
            type: MaterialType.Assignment,
            label: 'Tarefa',
            description: 'Peça para o aluno enviar um arquivo ou texto.',
            icon: Upload,
            color: 'bg-purple-100 text-purple-600'
        },
        {
            type: MaterialType.Link,
            label: 'Link Externo',
            description: 'Incorpore conteúdo de outros sites (Embed).',
            icon: LinkIcon,
            color: 'bg-yellow-100 text-yellow-600'
        },
        {
            type: MaterialType.File,
            label: 'Arquivo',
            description: 'Disponibilize PDFs, planilhas ou zips para download.',
            icon: File,
            color: 'bg-gray-100 text-gray-600'
        },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Adicionar Atividade ou Recurso</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resources.map((resource) => {
                        const Icon = resource.icon;
                        return (
                            <button
                                key={resource.type}
                                onClick={() => onSelect(resource.type)}
                                className="flex items-start p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md transition-all text-left group"
                            >
                                <div className={`p-3 rounded-lg ${resource.color} mr-4 group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {resource.label}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
                                        {resource.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 text-center text-sm text-gray-500">
                    Selecione o tipo de conteúdo que deseja adicionar ao módulo.
                </div>
            </div>
        </div>
    );
};

export default ResourcePicker;
