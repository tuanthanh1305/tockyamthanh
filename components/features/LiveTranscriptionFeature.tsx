
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import { Packer, Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import saveAs from 'file-saver';
import { 
    MicrophoneIcon, 
    StopIcon, 
    ArrowPathIcon,
    Cog6ToothIcon,
    DocumentPlusIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/solid';
import ErrorMessage from '../ui/ErrorMessage';

const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

// Main Component
const LiveTranscriptionFeature: React.FC = () => {
    // State
    const [status, setStatus] = useState('Sẵn sàng ghi âm');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rawTranscription, setRawTranscription] = useState('');
    const [polishedNote, setPolishedNote] = useState('');
    const [editorTitle, setEditorTitle] = useState('Ghi chép chưa có tiêu đề');
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'polished' | 'raw'>('polished');

    // Refs for non-state values
    const genAIRef = useRef<GoogleGenAI | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const waveformDataArrayRef = useRef<Uint8Array | null>(null);
    const waveformDrawingIdRef = useRef<number | null>(null);
    
    // Refs for DOM elements
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rawTranscriptionDivRef = useRef<HTMLPreElement>(null);
    const polishedNoteDivRef = useRef<HTMLDivElement>(null);
    
    // --- Initial Setup ---
    useEffect(() => {
        genAIRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        handleNewNote(); // Initialize with a clean slate
        return () => { // Cleanup on unmount
            streamRef.current?.getTracks().forEach(track => track.stop());
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
            if (waveformDrawingIdRef.current) cancelAnimationFrame(waveformDrawingIdRef.current);
        };
    }, []);

    // --- Core Recording Logic ---
    
    const toggleRecording = () => {
        if (isProcessing) return;
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };
    
    const startRecording = async () => {
        setError(null);
        setIsProcessing(true);
        setStatus('Đang yêu cầu quyền truy cập micro...');
        try {
            // Cleanup previous streams/contexts
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') await audioContextRef.current.close();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            setStatus('Đang khởi tạo...');
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            recorder.onstop = () => {
                setIsRecording(false);
                setIsProcessing(true);
                streamRef.current?.getTracks().forEach(track => track.stop());
                stopLiveDisplay();
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (audioBlob.size > 0) {
                    processAudio(audioBlob);
                } else {
                    setStatus('Không có dữ liệu âm thanh. Sẵn sàng ghi âm.');
                    setIsProcessing(false);
                }
            };
            
            recorder.start();
            setIsRecording(true);
            setIsProcessing(false);
            startLiveDisplay();
            
        } catch (error: any) {
            console.error('Lỗi bắt đầu ghi âm:', error);
            let errorMessage = `Lỗi: ${error.message}`;
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Quyền truy cập micro bị từ chối. Vui lòng kiểm tra cài đặt trình duyệt.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'Không tìm thấy micro. Vui lòng kết nối micro.';
            }
            setError(errorMessage);
            setStatus('Sẵn sàng ghi âm');
            setIsRecording(false);
            setIsProcessing(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    // --- AI Processing ---
    
    const processAudio = async (audioBlob: Blob) => {
        setStatus('Đang chuyển đổi âm thanh...');
        try {
            const base64Audio = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = (error) => reject(error);
            });
            
            await getTranscription(base64Audio, 'audio/webm');

        } catch (err: any) {
            setError(`Lỗi xử lý bản ghi: ${err.message}`);
            setStatus('Lỗi. Sẵn sàng ghi âm.');
            setIsProcessing(false);
        }
    };

    const getTranscription = async (base64Audio: string, mimeType: string) => {
        if (!genAIRef.current) return;
        setStatus('Đang lấy bản phiên âm...');
        try {
            const response = await genAIRef.current.models.generateContent({
                model: MODEL_NAME,
                contents: [
                    {text: 'Tạo một bản phiên âm đầy đủ, chi tiết của đoạn âm thanh này.'},
                    {inlineData: {mimeType, data: base64Audio}}
                ],
            });
            const transcriptionText = response.text;
            setRawTranscription(transcriptionText);
            
            await processTranscriptionAndPolish(transcriptionText);

        } catch (err: any) {
            setError(`Lỗi lấy bản phiên âm: ${err.message}`);
            setStatus('Lỗi. Sẵn sàng ghi âm.');
            setIsProcessing(false);
        }
    };

    const processTranscriptionAndPolish = async (transcription: string) => {
        if (!genAIRef.current || !transcription.trim()) {
            setStatus('Không có bản phiên âm để sửa. Sẵn sàng ghi âm.');
            setIsProcessing(false);
            return;
        }

        setIsProcessing(true);

        try {
            // 1. Language Detection
            setStatus('Đang xác định ngôn ngữ...');
            const langDetectPrompt = `Is the following text primarily in English or Vietnamese? Answer with only the word "English" or "Vietnamese".\n\nText: "${transcription.substring(0, 500)}"`;
            const langResponse = await genAIRef.current.models.generateContent({
                model: MODEL_NAME,
                contents: [{ text: langDetectPrompt }],
            });
            const detectedLanguage = langResponse.text.trim().toLowerCase();

            let finalPolishedText = '';

            if (detectedLanguage.includes('english')) {
                // English Workflow
                setStatus('Phát hiện tiếng Anh. Đang sửa ghi chép...');
                const polishEnglishPrompt = `You are a professional editor. Based on the raw English transcript below, edit it into a complete, clear, and professional note.\nREQUIREMENTS:\n- Fix all spelling and grammar errors.\n- Thoroughly remove filler words, repeated words, and unfinished sentences.\n- Add and use Markdown formatting (headings, lists, bold/italics) logically to structure the text for clarity and readability.\n- You MUST retain 100% of the original content and meaning.\n- Return only the edited note content.\n\nRaw Transcript:\n${transcription}`;
                const polishResponse = await genAIRef.current.models.generateContent({
                    model: MODEL_NAME,
                    contents: [{ text: polishEnglishPrompt }],
                });
                const polishedEnglishNote = polishResponse.text;

                if (!polishedEnglishNote.trim()) {
                    throw new Error("Polishing English note returned empty content.");
                }

                setStatus('Đang dịch ghi chép sang tiếng Việt...');
                const translatePrompt = `Translate the following English markdown text to Vietnamese. Preserve all markdown formatting (headings, lists, bold, etc.) perfectly. Output only the translated Vietnamese text.\n\nEnglish Markdown Text:\n${polishedEnglishNote}`;
                const translateResponse = await genAIRef.current.models.generateContent({
                    model: MODEL_NAME,
                    contents: [{ text: translatePrompt }],
                });
                finalPolishedText = translateResponse.text;
                setStatus('Ghi chép đã được sửa và dịch. Sẵn sàng cho bản ghi tiếp theo.');

            } else {
                // Vietnamese Workflow (or fallback)
                setStatus('Đang sửa và định dạng ghi chép...');
                const polishVietnamesePrompt = `Bạn là một biên tập viên chuyên nghiệp. Dựa vào bản phiên âm thô Tiếng Việt dưới đây, hãy biên tập lại thành một ghi chép hoàn chỉnh, tường minh và chuyên nghiệp.\nYÊU CẦU:\n- Sửa tất cả lỗi chính tả, ngữ pháp.\n- Loại bỏ triệt để các từ đệm, từ lặp, và câu nói dang dở.\n- Thêm và sử dụng định dạng Markdown (tiêu đề, danh sách, in đậm/nghiêng) một cách hợp lý để cấu trúc văn bản rõ ràng, dễ đọc.\n- Phải giữ nguyên 100% nội dung và ý nghĩa gốc.\n- Chỉ trả về nội dung ghi chép đã được biên tập.\n\nBản phiên âm thô:\n${transcription}`;
                const polishResponse = await genAIRef.current.models.generateContent({
                    model: MODEL_NAME,
                    contents: [{ text: polishVietnamesePrompt }],
                });
                finalPolishedText = polishResponse.text;
                setStatus('Ghi chép đã được sửa. Sẵn sàng cho bản ghi tiếp theo.');
            }

            if (!finalPolishedText.trim()) {
                throw new Error("AI không trả về nội dung đã sửa.");
            }
            
            await updatePolishedNoteUI(finalPolishedText);

        } catch (err: any) {
            setError(`Lỗi xử lý ghi chép: ${err.message}`);
            setPolishedNote('<p><em>Lỗi trong quá trình sửa ghi chép. Bản nháp vẫn có sẵn.</em></p>');
            setStatus('Lỗi. Sẵn sàng ghi âm.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const updatePolishedNoteUI = async (polishedText: string) => {
        setPolishedNote(await marked.parse(polishedText));
        extractTitleFromPolished(polishedText);
    };

    const extractTitleFromPolished = (text: string) => {
        const lines = text.split('\n').map(l => l.trim());
        for (const line of lines) {
            if (line.startsWith('#')) {
                const title = line.replace(/^#+\s+/, '').trim();
                if (title) {
                    setEditorTitle(title);
                    return;
                }
            }
        }
        for (const line of lines) {
             if (line.length > 3) {
                let potentialTitle = line.replace(/^[\* \`#\->\s\[\]\(.\d)]+/, '');
                potentialTitle = potentialTitle.replace(/[\*\`#]+$/, '').trim();
                if (potentialTitle) {
                   setEditorTitle(potentialTitle.substring(0, 80) + (potentialTitle.length > 80 ? '...' : ''));
                   return;
                }
            }
        }
    };

    // --- UI and Visualizer ---
    const startLiveDisplay = () => {
        setStatus('Đang ghi âm...');
        setupAudioVisualizer();
        drawLiveWaveform();
    };

    const stopLiveDisplay = () => {
        if (waveformDrawingIdRef.current) cancelAnimationFrame(waveformDrawingIdRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        const canvas = canvasRef.current;
        if(canvas) {
            const ctx = canvas.getContext('2d');
            if(ctx) ctx.clearRect(0,0, canvas.width, canvas.height);
        }
    };
    
    const setupAudioVisualizer = () => {
        if (!streamRef.current) return;
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
        source.connect(analyserRef.current);

        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        waveformDataArrayRef.current = new Uint8Array(bufferLength);
    };

    const drawLiveWaveform = () => {
        if (!isRecording) return;
        
        waveformDrawingIdRef.current = requestAnimationFrame(drawLiveWaveform);

        if (!analyserRef.current || !waveformDataArrayRef.current || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        analyserRef.current.getByteFrequencyData(waveformDataArrayRef.current);

        const dpr = window.devicePixelRatio || 1;
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const numBars = Math.floor(waveformDataArrayRef.current.length * 0.7);
        const barWidth = (canvasWidth / numBars) * 0.8;
        const barSpacing = (canvasWidth / numBars) * 0.2;
        let x = 0;

        ctx.fillStyle = '#38bdf8'; // sky-400
        
        for (let i = 0; i < numBars; i++) {
            const barHeight = (waveformDataArrayRef.current[i] / 255) * canvasHeight * 0.8;
            const y = (canvasHeight - barHeight) / 2;
            ctx.fillRect(x, y, barWidth, Math.max(1, barHeight));
            x += barWidth + barSpacing;
        }
    };

    // --- Actions ---
    const handleNewNote = useCallback(() => {
        if (isRecording || isProcessing) return;
        setEditorTitle('Ghi chép chưa có tiêu đề');
        setRawTranscription('');
        setPolishedNote('');
        setStatus('Sẵn sàng ghi âm');
        setError(null);
        setActiveView('polished');
    }, [isRecording, isProcessing]);
    
    const handleTitleChange = (e: React.FocusEvent<HTMLDivElement>) => {
        const newTitle = e.currentTarget.textContent || 'Ghi chép chưa có tiêu đề';
        setEditorTitle(newTitle.trim() ? newTitle : 'Ghi chép chưa có tiêu đề');
    };

    const handleDownload = useCallback(async () => {
        if (isRecording || isProcessing) return;
        
        const polishedContent = polishedNoteDivRef.current?.innerText || '';
        const rawContent = rawTranscriptionDivRef.current?.textContent || '';
        
        if (!polishedContent.trim() && !rawContent.trim()) {
            alert('Không có nội dung để tải xuống.');
            return;
        }

        const titleRun = new TextRun({ text: editorTitle, bold: true, size: 36, font: "Times New Roman" });
        const docChildren = [new Paragraph({ children: [titleRun], alignment: AlignmentType.CENTER, spacing: { after: 400 }})];

        if (polishedContent.trim()) {
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: "Ghi chép đã sửa", bold: true, size: 28, font: "Times New Roman" })],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 }
            }));
            polishedContent.split('\n').forEach(line => {
                docChildren.push(new Paragraph({ children: [new TextRun({ text: line, size: 26, font: "Times New Roman" })], spacing: { after: 100 }}));
            });
        }
        
        if (rawContent.trim()) {
            docChildren.push(new Paragraph({
                children: [new TextRun({ text: "Bản nháp", bold: true, size: 28, font: "Times New Roman" })],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 150 }
            }));
            rawContent.split('\n').forEach(line => {
                docChildren.push(new Paragraph({ children: [new TextRun({ text: line, size: 26, font: "Times New Roman" })], spacing: { after: 100 }}));
            });
        }

        const doc = new Document({ sections: [{ children: docChildren }] });

        try {
            const blob = await Packer.toBlob(doc);
            const safeTitle = editorTitle.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
            saveAs(blob, `${safeTitle || 'ghi_chep'}.docx`);
        } catch(e) {
            setError("Lỗi khi tạo tệp DOCX.");
            console.error(e);
        }

    }, [editorTitle, polishedNote, rawTranscription, isRecording, isProcessing]);


    // --- Render ---
    return (
        <div className="flex flex-col h-full w-full text-slate-200 bg-slate-900">
            {/* Header */}
            <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-700/80">
                <div 
                    contentEditable={!isRecording && !isProcessing}
                    onBlur={handleTitleChange}
                    suppressContentEditableWarning={true}
                    className="text-2xl font-bold text-slate-100 outline-none focus:ring-2 focus:ring-sky-500 rounded px-2 -ml-2 w-full max-w-[50%] truncate"
                    title="Nhấn để sửa tiêu đề"
                >
                    {editorTitle}
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-800 p-1 rounded-lg shadow-inner">
                        <button
                            onClick={() => setActiveView('polished')}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'polished' ? 'bg-sky-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700'}`}
                        >
                            Ghi chép đã sửa
                        </button>
                        <button
                            onClick={() => setActiveView('raw')}
                            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'raw' ? 'bg-sky-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700'}`}
                        >
                            Bản nháp
                        </button>
                    </div>
                    <button 
                        onClick={handleDownload} 
                        disabled={isRecording || isProcessing || (!rawTranscription && !polishedNote)} 
                        className="p-2.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Tải xuống (.docx)"
                    >
                        <ArrowDownTrayIcon className="h-5 w-5"/>
                    </button>
                </div>
            </div>

            {error && <div className="p-4 flex-shrink-0"><ErrorMessage message={error} /></div>}
            
            <div className="flex-grow p-4 overflow-y-auto custom-scrollbar min-h-0">
                {activeView === 'polished' ? (
                     <div 
                        ref={polishedNoteDivRef}
                        className="prose prose-sm sm:prose-base prose-invert max-w-none break-words h-full"
                        dangerouslySetInnerHTML={{ __html: polishedNote || '<p class="text-slate-500">Ghi chép đã sửa của bạn sẽ xuất hiện ở đây...</p>' }}
                    />
                ) : (
                     <pre 
                        ref={rawTranscriptionDivRef}
                        className="whitespace-pre-wrap text-slate-300 h-full font-sans"
                    >
                        {rawTranscription || <span className="text-slate-500">Bản ghi âm thô của bạn sẽ xuất hiện ở đây...</span>}
                     </pre>
                )}
            </div>

            <div className="flex-shrink-0 flex flex-col items-center justify-end pt-4 pb-6 px-4 border-t border-slate-700/80 gap-3 bg-slate-900/50">
                <div className="text-center h-[60px] flex flex-col items-center justify-center">
                    <p className={`text-lg font-medium transition-colors duration-300 ${isRecording ? 'text-yellow-300 animate-pulse' : 'text-slate-400'}`}>{status}</p>
                    {isRecording && (
                        <canvas ref={canvasRef} className="w-64 h-12 mt-1 bg-slate-800/50 rounded-md"></canvas>
                    )}
                </div>

                <div className="flex items-center justify-center gap-8 w-full">
                    <button 
                        disabled={true}
                        className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-700/80 text-slate-500 transition-colors opacity-50 cursor-not-allowed"
                        title="Cài đặt"
                    >
                        <Cog6ToothIcon className="h-8 w-8"/>
                    </button>
                     <button
                        onClick={toggleRecording}
                        disabled={isProcessing && !isRecording}
                        aria-label={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-2xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900
                            ${isRecording ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500' : 'bg-sky-600 hover:bg-sky-500 focus:ring-sky-500'}
                            ${isProcessing && !isRecording ? 'bg-slate-600 cursor-not-allowed' : ''}
                        `}
                    >
                        {isProcessing && !isRecording ? <ArrowPathIcon className="h-9 w-9 animate-spin"/> : (isRecording ? <StopIcon className="h-9 w-9" /> : <MicrophoneIcon className="h-9 w-9" />)}
                        {isRecording && <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-ping"></div>}
                    </button>
                    <button 
                        onClick={handleNewNote}
                        disabled={isRecording || isProcessing}
                        className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-700/80 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50"
                        title="Tạo ghi chép mới"
                    >
                        <DocumentPlusIcon className="h-8 w-8"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveTranscriptionFeature;
