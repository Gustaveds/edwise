import React, { useState } from 'react';
import axios from 'axios';
import { Upload, X, AlertCircle, FileVideo, Loader2 } from 'lucide-react';
import MinimizableProcessingModal from './MinimizableProcessingModal';
import config from '../config';

interface VideoUploadProps {
    moduleId: number;
    onUploadComplete: () => void;
    onCancel: () => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'error';

const VideoUpload: React.FC<VideoUploadProps> = ({ moduleId, onUploadComplete, onCancel }) => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [videoId, setVideoId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, "")); // Default title to filename without extension
        }
    };

    const handleUpload = async () => {
        if (!file || !title) {
            setError('Please select a file and provide a title.');
            return;
        }

        setUploadState('uploading');
        setError(null);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('module_id', moduleId.toString());

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(config.API_URL + '/api/upload/video', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                }
            });

            // Upload complete, now processing
            setVideoId(response.data.video_id);
            setUploadState('processing');
            setUploadProgress(100);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to upload video.');
            setUploadState('error');
        }
    };

    // Show minimizable modal during processing (no backdrop wrapper needed)
    if (uploadState === 'processing' && videoId) {
        return (
            <MinimizableProcessingModal
                videoId={videoId}
                videoTitle={title}
                onComplete={onUploadComplete}
                onClose={onUploadComplete}
            />
        );
    }

    // Upload form with backdrop
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <FileVideo className="w-5 h-5 text-blue-600" />
                        Upload Video Lesson
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-500 hover:text-gray-700"
                        disabled={uploadState === 'uploading'}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {/* File Input */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="video-upload"
                            disabled={uploadState === 'uploading'}
                        />
                        <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                            {file ? (
                                <>
                                    <FileVideo className="w-12 h-12 text-blue-500 mb-2" />
                                    <span className="text-sm font-medium text-gray-700">{file.name}</span>
                                    <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-600">Click to select video file</span>
                                    <span className="text-xs text-gray-500">MP4, WebM, MOV up to 2GB</span>
                                </>
                            )}
                        </label>
                    </div>

                    {/* Metadata Inputs */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            placeholder="e.g., Introduction to React"
                            disabled={uploadState === 'uploading'}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            rows={3}
                            placeholder="Brief description of the lesson..."
                            disabled={uploadState === 'uploading'}
                        />
                    </div>

                    {/* Progress Bar */}
                    {uploadState === 'uploading' && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                            <p className="text-xs text-center text-gray-500 mt-1">{uploadProgress}% Uploaded</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={onCancel}
                            disabled={uploadState === 'uploading'}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={uploadState === 'uploading' || !file}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {uploadState === 'uploading' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                'Upload Video'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoUpload;
