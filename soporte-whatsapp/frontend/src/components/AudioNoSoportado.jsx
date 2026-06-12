import { useState, useRef, useEffect } from "react";

function AudioNoSoportado({ metadata, esAgenteBubble, mensaje, url_audio }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioError, setAudioError] = useState(false);
    const audioRef = useRef(null);
    
    const API_BASE = import.meta.env.VITE_API_URL || 'http://179.63.191.40:9020';
    
    const getFullAudioUrl = () => {
        if (!url_audio) return null;
        if (url_audio.startsWith('http://') || url_audio.startsWith('https://')) {
            return url_audio;
        }
        if (url_audio.startsWith('/')) {
            return `${API_BASE}${url_audio}`;
        }
        return `${API_BASE}/${url_audio}`;
    };
    
    const fullAudioUrl = getFullAudioUrl();
    
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !fullAudioUrl) return;
        
        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
            setAudioError(false);
        };
        
        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            setProgress((audio.currentTime / audio.duration) * 100);
        };
        
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };
        
        const handleError = () => {
            console.error('Error cargando audio:', fullAudioUrl);
            setAudioError(true);
        };
        
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);
        
        audio.load();
        
        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, [fullAudioUrl]);
    
    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio || audioError) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(e => console.error('Error reproduciendo:', e));
        }
    };
    
    if (!fullAudioUrl || audioError) {
        return (
            <div className={`flex items-center gap-2 p-2 rounded-lg ${esAgenteBubble ? "bg-white/10" : "bg-gray-100 dark:bg-gray-700"}`}>
                <div className="w-8 h-8 rounded-full bg-gray-400/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                </div>
                <div className="flex-1">
                    <div className="text-xs text-gray-500">🎤 Audio no disponible</div>
                    <div className="text-[10px] text-gray-400">{mensaje?.substring(0, 50) || "El cliente intentó enviar un audio"}</div>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`flex items-center gap-2 p-1 rounded-lg ${esAgenteBubble ? "bg-white/10" : "bg-gray-100 dark:bg-gray-700"}`}>
            <audio ref={audioRef} preload="metadata">
                <source src={fullAudioUrl} type="audio/mpeg" />
                <source src={fullAudioUrl} type="audio/ogg" />
                <source src={fullAudioUrl} type="audio/webm" />
            </audio>
            
            <button 
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#20B859] text-white flex items-center justify-center transition-all shadow-md flex-shrink-0"
            >
                {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-mono flex-shrink-0">
                        {formatTime(currentTime)}
                    </span>
                    <div className="flex-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                            const audio = audioRef.current;
                            if (!audio || !duration) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const percent = x / rect.width;
                            audio.currentTime = percent * duration;
                        }}
                    >
                        <div 
                            className="h-full bg-[#25D366] rounded-full transition-all duration-100"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono flex-shrink-0">
                        {formatTime(duration)}
                    </span>
                </div>
            </div>
            
            <div className="w-6 h-6 rounded-full bg-gray-400/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
            </div>
        </div>
    );
}

export default AudioNoSoportado;

