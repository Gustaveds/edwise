import React, { useEffect, useRef } from 'react';
import config from '../config';

interface YouTubePlayerProps {
    videoId: string;
    contentId: number;
}

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

// A API do YouTube só precisa ser carregada uma vez por sessão de página,
// independente de quantos players forem montados/desmontados.
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve) => {
        const previousCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previousCallback?.();
            resolve();
        };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.body.appendChild(tag);
        }
    });
    return ytApiPromise;
}

// Reaproveita o mesmo endpoint de posição de reprodução já usado pelos
// vídeos enviados diretamente — "player próprio" aqui significa controle via
// JS (YouTube IFrame API) em vez de um <iframe src=...> estático, o que dá
// retomar-de-onde-parou consistente com o resto do player.
const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, contentId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const saveProgress = (seconds: number) => {
        if (!Number.isFinite(seconds)) return;
        fetch(`${config.API_URL}/api/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ content_id: contentId, position_seconds: Math.floor(seconds) })
        }).catch(err => console.error('Error saving YouTube progress:', err));
    };

    useEffect(() => {
        let destroyed = false;

        loadYouTubeApi().then(async () => {
            if (destroyed || !containerRef.current) return;

            let savedPosition = 0;
            try {
                const response = await fetch(`${config.API_URL}/api/progress/${contentId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await response.json();
                savedPosition = data?.last_position_seconds || 0;
            } catch (err) {
                console.error('Error fetching YouTube progress:', err);
            }
            if (destroyed || !containerRef.current) return;

            playerRef.current = new window.YT.Player(containerRef.current, {
                videoId,
                playerVars: { rel: 0 },
                events: {
                    onReady: (event: any) => {
                        if (savedPosition > 5) {
                            event.target.seekTo(savedPosition, true);
                        }
                    },
                    onStateChange: (event: any) => {
                        const PLAYING = 1, PAUSED = 2, ENDED = 0;
                        if (saveIntervalRef.current) {
                            clearInterval(saveIntervalRef.current);
                            saveIntervalRef.current = null;
                        }
                        if (event.data === PLAYING) {
                            saveIntervalRef.current = setInterval(() => {
                                saveProgress(playerRef.current?.getCurrentTime?.() ?? 0);
                            }, 10_000);
                        } else if (event.data === PAUSED || event.data === ENDED) {
                            saveProgress(playerRef.current?.getCurrentTime?.() ?? 0);
                        }
                    }
                }
            });
        });

        return () => {
            destroyed = true;
            if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
            if (playerRef.current?.getCurrentTime) {
                try { saveProgress(playerRef.current.getCurrentTime()); } catch { /* player já destruído */ }
            }
            if (playerRef.current?.destroy) {
                try { playerRef.current.destroy(); } catch { /* ignora */ }
            }
        };
    }, [videoId, contentId]);

    // O YT.Player substitui o nó que recebe por um <iframe> próprio, por
    // fora do controle do React. Se passássemos o ref direto no div que o
    // React renderiza, ao desmontar (ex: trocar de aula) o React tentaria
    // remover um nó que já não existe mais — e quebra a árvore inteira
    // (tela branca). O wrapper externo nunca é tocado pelo YouTube, só o
    // filho interno é substituído, então o React sempre acha o que espera.
    return (
        <div className="w-full h-full">
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
};

export default YouTubePlayer;
