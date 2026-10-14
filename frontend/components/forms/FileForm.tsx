import React, { useState } from 'react';
import { Save, FileText, Download, ExternalLink, Paperclip } from 'lucide-react';
import { useToast } from '../ui/Toast';
import config from '../../config';

interface FileFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    initialData?: any;
}

const FileForm: React.FC<FileFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const toast = useToast();

    const fileData = initialData?.data || {};
    const token = localStorage.getItem('token');
    const fileUrl = initialData?.id
        ? `${config.API_URL}/api/contents/${initialData.id}/file?token=${token}`
        : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title,
            type: initialData?.type || 'pdf',
            data: fileData,
            description,
        });
        toast.success('Arquivo atualizado com sucesso');
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
                <label className="label">Título do Material</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="Ex: Apostila de Estudo - PDF"
                    required
                />
            </div>

            <div>
                <label className="label">Descrição / Instruções</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="input resize-y"
                    placeholder="Orientações de leitura para os alunos…"
                />
            </div>

            {/* Attached file information card */}
            <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-5 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 grid place-items-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-900 truncate">
                            {fileData.filename || 'Arquivo anexado'}
                        </p>
                        {fileData.size && (
                            <p className="text-xs font-mono text-ink-500">
                                {(fileData.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                        )}
                    </div>
                    {fileUrl && (
                        <div className="flex items-center gap-2">
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                                title="Abrir arquivo em nova aba"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Abrir
                            </a>
                            <a
                                href={fileUrl}
                                download={fileData.filename || 'material.pdf'}
                                className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                                title="Baixar arquivo"
                            >
                                <Download className="w-3.5 h-3.5" /> Baixar
                            </a>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-ink-100">
                <button type="button" onClick={onCancel} className="btn-secondary">
                    Cancelar
                </button>
                <button type="submit" className="btn-primary">
                    <Save className="w-4 h-4" /> Salvar alterações
                </button>
            </div>
        </form>
    );
};

export default FileForm;
