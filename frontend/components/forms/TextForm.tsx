import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { MaterialType } from '../../types';
import { useToast } from '../ui/Toast';

interface TextFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    initialData?: any;
}

const TextForm: React.FC<TextFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const toast = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title,
            type: MaterialType.Text,
            content,
            description: 'Artigo de texto',
        });
        toast.success('Artigo salvo');
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
                <label className="label">Título do artigo</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="Ex: Leitura complementar — capítulo 1"
                    required
                />
            </div>

            <div>
                <label className="label">Conteúdo</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={15}
                    className="input font-mono text-sm resize-y"
                    placeholder="# Escreva seu artigo aqui (Markdown suportado)…"
                    required
                />
                <p className="text-xs text-ink-500 mt-2">
                    Dica: você pode usar Markdown para formatar o texto.
                </p>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-ink-100">
                <button type="button" onClick={onCancel} className="btn-secondary">
                    Cancelar
                </button>
                <button type="submit" className="btn-primary">
                    <Save className="w-4 h-4" /> Salvar artigo
                </button>
            </div>
        </form>
    );
};

export default TextForm;
