import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children: React.ReactNode;
    footer?: React.ReactNode;
    /** Hide the close button & disable overlay click (forces user to choose an action). */
    hideClose?: boolean;
}

const SIZES: Record<NonNullable<ModalProps['size']>, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

const Modal: React.FC<ModalProps> = ({
    isOpen, onClose, title, description, size = 'md', children, footer, hideClose = false
}) => {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !hideClose) onClose();
        };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, hideClose, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6 animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Overlay */}
            <button
                type="button"
                aria-label="Fechar"
                onClick={hideClose ? undefined : onClose}
                disabled={hideClose}
                className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm cursor-default"
            />

            {/* Dialog */}
            <div
                className={`relative w-full ${SIZES[size]} glass overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                {(title || !hideClose) && (
                    <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
                        <div className="min-w-0">
                            {title && (
                                <h3 id="modal-title" className="font-display text-xl font-semibold text-ink-900">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="mt-1 text-sm text-ink-600">{description}</p>
                            )}
                        </div>
                        {!hideClose && (
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900 transition-colors flex-shrink-0"
                                aria-label="Fechar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                <div className="px-6 pb-6">
                    {children}
                </div>

                {footer && (
                    <div className="px-6 py-4 bg-white/60 border-t border-ink-200 flex flex-wrap items-center justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
