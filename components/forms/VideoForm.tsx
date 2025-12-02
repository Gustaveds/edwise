import React, { useState } from 'react';
import { MaterialType } from '../../types';
import VideoAIDataPanel from '../VideoAIDataPanel';
import { Video, Trash2, Play } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import config from '../../config';

interface VideoFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    initialData?: any;
}

const VideoForm: React.FC<VideoFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const { token } = useAuth();
    const [title, setTitle] = useState(initialData?.title || '');
    const [url, setUrl] = useState(initialData?.content || '');
    const [description, setDescription] = useState(initialData?.description || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title,
            type: MaterialType.Video,
            content: url,
            description
        });
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este vídeo? Esta ação é irreversível.')) return;

        try {
            const res = await fetch(`${config.API_URL}/api/contents/${initialData.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to delete video');

            onCancel(); // Close form/refresh
            // We might need to trigger a refresh in parent. onCancel just closes. 
            // Ideally onSubmit or a new prop onDelete should be called. 
            // But CourseEditor refreshes on state change? 
            // Actually CourseEditor needs to know to refresh. 
            // Let's assume onCancel will trigger a re-fetch or we should reload the page?
            // For now, let's just reload window or rely on parent. 
            // Actually, let's call onSubmit with a special flag or just reload.
            window.location.reload(); // Simple fix for now to ensure state sync
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir vídeo.');
        }
    };

    // Check if this is an uploaded video (has video_id in initialData)
    const isUploadedVideo = initialData?.video_id;

    return (
        <div className="space-y-6">
            {/* Video Info Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Título da Aula
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Introdução ao React"
                        required
                    />
                </div>

                {!isUploadedVideo && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            URL do Vídeo (YouTube/Vimeo)
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            placeholder="https://youtube.com/watch?v=..."
                            required
                        />
                    </div>
                )}

                {isUploadedVideo && (
                    <div className="space-y-4">
                        <div className="bg-black rounded-lg overflow-hidden aspect-video relative group">
                            <video
                                controls
                                className="w-full h-full"
                                src={`${config.API_URL}/api/videos/${initialData.video_id}/stream?token=${token}`}
                            >
                                Seu navegador não suporta o elemento de vídeo.
                            </video>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                <Video className="w-5 h-5" />
                                <span className="font-medium">Vídeo Carregado</span>
                            </div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                ID do Vídeo: #{initialData.video_id}
                            </p>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Descrição (Opcional)
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="Descreva o que será abordado nesta aula..."
                    />
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    {initialData?.id && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir Vídeo
                        </button>
                    )}
                    <div className="flex space-x-3 ml-auto">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                        >
                            Salvar Vídeo
                        </button>
                    </div>
                </div>
            </form>

            {/* AI Processing Section - Only for uploaded videos */}
            {isUploadedVideo && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                        Dados Gerados pela IA
                    </h3>
                    <VideoAIDataPanel videoId={initialData.video_id} />
                </div>
            )}
        </div>
    );
};

export default VideoForm;
