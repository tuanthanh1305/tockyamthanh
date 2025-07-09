import React, { useState, useRef, useEffect, FC } from 'react';
import { ArrowsPointingOutIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

const WIDGET_SCRIPT_ID = 'elevenlabs-convai-script';
const AGENT_ID = 'agent_01jzhy6qvbeakrrd40d78vaayg';

const ElevenLabsWidget: FC = () => {
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    // 1. Inject the script for the widget
    useEffect(() => {
        if (document.getElementById(WIDGET_SCRIPT_ID)) {
            return;
        }

        const script = document.createElement('script');
        script.id = WIDGET_SCRIPT_ID;
        script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
        script.async = true;
        script.type = 'text/javascript';
        document.head.appendChild(script);
    }, []);

    // 2. Set initial position after component mounts
    useEffect(() => {
        const PADDING = 24;
        const WIDGET_WIDTH = 350; 
        const WIDGET_HEIGHT = 500;
      
        const x = window.innerWidth - (WIDGET_WIDTH + PADDING);
        const y = window.innerHeight - (WIDGET_HEIGHT + PADDING);

        setPosition({ 
            x: Math.max(PADDING, x),
            y: Math.max(PADDING, y)
        });
    }, []);

    // 3. Drag and drop handlers
    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Ensure we are only dragging by the header
        if (!(e.target as HTMLElement).closest('[data-drag-handle]')) {
            return;
        }
        
        if (!containerRef.current || !position) return;
        isDraggingRef.current = true;
        dragOffsetRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.preventDefault(); // Prevent text selection
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current || !containerRef.current) return;
        
        let newX = e.clientX - dragOffsetRef.current.x;
        let newY = e.clientY - dragOffsetRef.current.y;

        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;

        // Keep the widget within the viewport
        newX = Math.max(0, Math.min(newX, window.innerWidth - containerWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - containerHeight));

        setPosition({ x: newX, y: newY });
    };

    const onMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    if (!position) {
        return null; // Don't render until position is calculated
    }
    
    return (
        <div
            ref={containerRef}
            className="fixed z-[100] w-[350px] h-[500px] flex flex-col glass-pane rounded-xl shadow-2xl shadow-sky-900/50 border border-sky-500/30 overflow-hidden animate-fadeInUp"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                touchAction: 'none'
            }}
            onMouseDown={onMouseDown} // Attach mouse down to the whole container but check for handle inside
        >
            <div
                data-drag-handle="true"
                className="flex-shrink-0 h-10 bg-slate-900/70 cursor-move flex items-center justify-between px-3 border-b border-slate-700/80"
            >
                <div className="flex items-center gap-2">
                    <SpeakerWaveIcon className="h-5 w-5 text-sky-400" />
                    <span className="font-semibold text-sm text-slate-200">Trợ lý Giọng nói</span>
                </div>
                <ArrowsPointingOutIcon className="h-5 w-5 text-slate-400" title="Kéo để di chuyển" />
            </div>

            <div className="flex-grow bg-slate-950/50">
                {/* The widget will be mounted here by its own script. Using React.createElement to bypass TSX checking for the custom element. */}
                {React.createElement('elevenlabs-convai', { 'agent-id': AGENT_ID })}
            </div>
        </div>
    );
};

export default ElevenLabsWidget;
