
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, PaperClipIcon, XCircleIcon, LinkIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import { SparklesIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'; // For AI messages
import { ChatMessage, ChatMessageAttachment } from '../../types';
import { marked } from 'marked';
import ExportButton from './ExportButton';
import CopyButton from './CopyButton';

interface ChatInterfaceProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string, attachment?: ChatMessageAttachment) => Promise<void>;
  isLoading: boolean;
  featureTitle: string; 
  enableAttachments?: boolean;
  enableVoiceInput?: boolean;
  exportableChatContent?: string;
  exportChatFilename?: string;
}

declare global {
    interface Window {
      SpeechRecognition: any;
      webkitSpeechRecognition: any;
    }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      if (base64Data) {
        resolve(base64Data);
      } else {
        reject(new Error("Không thể trích xuất dữ liệu base64 từ tệp."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

const formatTimestamp = (date: Date): string => {
    const today = new Date();
    const messageDate = new Date(date); 

    if (
        messageDate.getFullYear() === today.getFullYear() &&
        messageDate.getMonth() === today.getMonth() &&
        messageDate.getDate() === today.getDate()
    ) {
        return messageDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else {
        return `${messageDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${messageDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
};

const AiLoadingIndicator: React.FC = () => (
  <div className="flex items-center space-x-2 py-1">
    <SparklesIcon className="h-5 w-5 text-sky-400 animate-pulse-glow" />
    <span className="text-sm text-slate-300/90">AI đang suy nghĩ</span>
    <div className="flex space-x-1.5 ml-1">
      <div className="w-2 h-2 bg-sky-400 rounded-full ai-loading-dot dot1"></div>
      <div className="w-2 h-2 bg-sky-400 rounded-full ai-loading-dot dot2"></div>
      <div className="w-2 h-2 bg-sky-400 rounded-full ai-loading-dot dot3"></div>
    </div>
  </div>
);


const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    chatHistory, 
    onSendMessage, 
    isLoading, 
    featureTitle,
    enableAttachments = false,
    enableVoiceInput = false,
    exportableChatContent,
    exportChatFilename
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<ChatMessageAttachment | null>(null);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [urlInputValue, setUrlInputValue] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 128; // max-h-32 (8rem)
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputMessage]);

  // Speech Recognition Effect
  useEffect(() => {
    if (!enableVoiceInput || !isSpeechRecognitionSupported) return;

    if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'vi-VN';
    }

    const recognition = recognitionRef.current;
    
    const handleResult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => (prev.trim() ? prev.trim() + ' ' : '') + transcript);
    };

    const handleEnd = () => setIsRecording(false);
    const handleError = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
    };

    recognition.addEventListener('result', handleResult);
    recognition.addEventListener('end', handleEnd);
    recognition.addEventListener('error', handleError);

    return () => {
        recognition.removeEventListener('result', handleResult);
        recognition.removeEventListener('end', handleEnd);
        recognition.removeEventListener('error', handleError);
    };
  }, [enableVoiceInput]);

  const toggleRecording = () => {
    if (!isSpeechRecognitionSupported || isLoading) return;
    
    const recognition = recognitionRef.current;
    if (isRecording) {
        recognition.stop();
        setIsRecording(false);
    } else {
        try {
            recognition.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Could not start recording", err);
            setIsRecording(false);
        }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInputValue(e.target.value);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setShowUrlInput(false);
      setUrlInputValue('');
      let attachmentType: 'image' | 'file' = 'file';
      if (file.type.startsWith('image/')) {
        attachmentType = 'image';
      }
      
      try {
        const originalFileBase64 = await fileToBase64(file); 

        // Client-side text extraction has been removed to rely on Gemini's native file processing,
        // which resolves errors with formats like .doc.
        setPendingAttachment({
          type: attachmentType,
          data: originalFileBase64, 
          mimeType: file.type,
          name: file.name,
        });

      } catch (error) {
        console.error("Error processing file for attachment:", error);
        alert("Lỗi xử lý tệp đính kèm. Vui lòng thử lại.");
        setPendingAttachment(null);
      }
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
    }
  };

  const handleAttachUrl = () => {
    if (!urlInputValue.trim()) {
        alert("Vui lòng nhập URL hợp lệ.");
        return;
    }
    try {
        new URL(urlInputValue.trim()); 
        setPendingAttachment({
            type: 'url',
            data: urlInputValue.trim(),
            name: `URL: ${urlInputValue.trim().substring(0,60)}...`,
        });
        setShowUrlInput(false);
        setUrlInputValue('');
    } catch (_) {
        alert("URL không hợp lệ. Vui lòng kiểm tra lại (ví dụ: https://example.com).");
    }
  };

  const clearPendingAttachment = () => {
    setPendingAttachment(null);
    setShowUrlInput(false);
    setUrlInputValue('');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    if ((inputMessage.trim() === '' && !pendingAttachment) || isLoading) return;
    
    await onSendMessage(inputMessage.trim(), pendingAttachment || undefined);
    setInputMessage('');
    clearPendingAttachment();
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; 
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleUrlInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAttachUrl();
    }
  };

  const getExportContent = (message: ChatMessage): string => {
    if (featureTitle === "AI Tin tức" && message.newsArticles && message.newsArticles.length > 0) {
        const articlesText = message.newsArticles.map(article => 
            `Tiêu đề: ${article.title}\n` +
            (article.publication_date ? `Thời gian: ${article.publication_date}\n` : '') +
            `Nguồn: ${article.url}\n\n` +
            (article.summary ? `Tóm tắt:\n${article.summary}`: '')
        ).join('\n\n---\n\n');
        return `${message.content}\n\n${articlesText}`;
    }

    if (featureTitle === "Phân tích Văn bản") {
        const contentStr = message.content.trim();
        // Check if the content is likely a JSON string before attempting to parse.
        // This prevents errors when the content is a normal chat message or an error string.
        if (contentStr.startsWith('```') || contentStr.startsWith('{')) {
            try {
                let jsonStr = contentStr;
                
                // More robustly find the JSON blob, even if wrapped in text or markdown fences.
                const fenceMatch = jsonStr.match(/```(?:json)?\s*({[\s\S]+?})\s*```/s);
                if (fenceMatch && fenceMatch[1]) {
                    jsonStr = fenceMatch[1];
                } else {
                    const firstBrace = jsonStr.indexOf('{');
                    const lastBrace = jsonStr.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace > firstBrace) {
                        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                    }
                }

                const parsed = JSON.parse(jsonStr);
                if (parsed && typeof parsed.analysis === 'string') {
                    return parsed.analysis;
                }
            } catch (e) {
                // It's not valid JSON, or doesn't have the 'analysis' field.
                // Fallback to returning the original content.
                console.warn("Could not parse analysis JSON for export, falling back to raw content.", e);
            }
        }
    }
    
    // Fallback for all other cases: regular chat, errors, or other features.
    return message.content;
  };


  return (
    <div className="flex flex-col flex-grow h-full max-h-full w-full"> {/* Ensure full width */}
      <h3 className="text-lg sm:text-xl font-semibold text-gradient-cyber mb-3 sm:mb-4">
        Bảng Điều Khiển Tương Tác ABAII
      </h3>
      <div className="bg-slate-800/80 p-3 sm:p-4 rounded-xl shadow-inner border border-slate-700/60 flex-grow overflow-y-auto custom-scrollbar flex flex-col space-y-3 sm:space-y-4 mb-3 sm:mb-4">
        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end pl-4 sm:pl-6' : 'justify-start pr-4 sm:pr-6'}`}
          >
            <div
              className={`relative max-w-[90%] sm:max-w-[85%] p-3 sm:p-4 shadow-xl text-sm sm:text-base border transition-all duration-300 ease-in-out group
                ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 text-white rounded-t-2xl rounded-bl-2xl border-sky-400/50'
                  : 'bg-slate-700/80 text-slate-100 rounded-t-2xl rounded-br-2xl border-slate-600/70 backdrop-blur-sm'
              }`}
            >
              {msg.isLoading ? (
                  <AiLoadingIndicator />
              ) : (
                <>
                  {msg.attachment && (
                    <div className={`mb-2 p-2.5 border rounded-lg shadow-sm
                                     ${msg.role === 'user' ? 'border-sky-300/30 bg-sky-700/50' : 'border-slate-500/40 bg-slate-600/60'}`}>
                      <p className="text-xs font-medium truncate text-slate-200/90 flex items-center">
                        {msg.attachment.type === 'url' ? <LinkIcon className="h-4 w-4 mr-2 text-sky-300 shrink-0"/> : <PaperClipIcon className="h-4 w-4 mr-2 text-sky-300 shrink-0"/>}
                        {msg.attachment.name || msg.attachment.data}
                      </p>
                      {msg.attachment.type === 'image' && msg.attachment.mimeType && msg.attachment.data && (
                        <img 
                            src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} 
                            alt={msg.attachment.name || 'hình ảnh đính kèm'}
                            className="max-h-40 rounded mt-2 object-contain border border-slate-500/50"
                        />
                      )}
                      {(msg.attachment.type === 'file' && (msg.attachment.mimeType?.startsWith('audio/') || msg.attachment.mimeType?.startsWith('video/'))) && (
                         <p className="text-xs text-slate-300 mt-1.5">({msg.attachment.mimeType}) - AI sẽ phân tích nội dung.</p>
                      )}
                    </div>
                  )}
                  <div 
                    className="prose prose-sm sm:prose-base prose-invert max-w-none break-words 
                               [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 
                               [&_h1]:text-lg [&_h1]:mb-1 [&_h2]:text-base [&_h2]:mb-0.5
                               [&_code]:bg-slate-900/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                               [&_pre]:bg-slate-900/50 [&_pre]:p-2.5 [&_pre]:rounded-md [&_pre]:custom-scrollbar [&_pre_code]:bg-transparent"
                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }} 
                  />
                  
                  {msg.newsArticles && msg.newsArticles.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-4">
                          {msg.newsArticles.map((article, index) => (
                              <div key={index} className="bg-slate-800/60 p-3 rounded-lg shadow-inner border border-slate-600/40">
                                  <h5 className="text-base font-bold text-sky-300 mb-1 hover:text-sky-200 transition-colors">
                                      <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a>
                                  </h5>
                                  {article.publication_date && <p className="text-xs text-slate-400 mb-1.5">Thời gian: {article.publication_date}</p>}
                                  {article.summary && <p className="text-sm text-slate-300 leading-relaxed mb-2">{article.summary}</p>}
                                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-sky-400 hover:text-sky-300 group">
                                      Đọc thêm tại nguồn
                                      <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-1.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
                                  </a>
                              </div>
                          ))}
                      </div>
                  )}

                  <div className={`mt-2.5 pt-2 border-t flex justify-between items-center ${msg.role === 'user' ? 'border-sky-300/30' : 'border-slate-600/50'}`}>
                      <p className={`text-xs opacity-70 ${msg.role === 'user' ? 'text-sky-100/70' : 'text-slate-400/70'}`}> 
                          {formatTimestamp(new Date(msg.timestamp))}
                      </p>
                      
                      {msg.role === 'model' && msg.content.trim() && (
                          <div className="flex items-center gap-1.5">
                              <CopyButton textToCopy={msg.content} />
                              {(featureTitle === "Phân tích Văn bản" || featureTitle === "Soạn thảo Văn bản" || featureTitle === "Trích xuất Đa phương tiện" || featureTitle === "AI Tin tức") && (
                                  <ExportButton 
                                      content={getExportContent(msg)}
                                      filename={`${featureTitle.replace(/[\s\/]/g, '_')}_${msg.id}`}
                                      buttonText=""
                                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all"
                                      title="Xuất DOCX"
                                  />
                              )}
                          </div>
                      )}
                  </div>
                </>
              )}
               {/* Message Tail */}
              <div className={`absolute bottom-0 w-3 h-3 
                ${msg.role === 'user' ? 'right-[-5px] bg-indigo-600 group-hover:bg-indigo-500' : 'left-[-5px] bg-slate-700/80 group-hover:bg-slate-600/90'} 
                transform rotate-45 transition-colors`}>
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      
      {pendingAttachment && (
        <div className="my-2 p-3 bg-slate-700/90 border border-slate-600/80 rounded-lg text-sm text-slate-200 flex justify-between items-center shadow-lg animate-fadeInUp animation-delay-0">
            <div className="flex items-center overflow-hidden gap-2">
                {pendingAttachment.type === 'url' ? <LinkIcon className="h-5 w-5 text-sky-400 shrink-0"/> : <PaperClipIcon className="h-5 w-5 text-sky-400 shrink-0"/>}
                <span className="truncate font-medium" title={pendingAttachment.name || pendingAttachment.data}>
                    {pendingAttachment.name || pendingAttachment.data} 
                </span>
                <span className="text-xs opacity-80 ml-1.5 whitespace-nowrap bg-slate-600 px-1.5 py-0.5 rounded">({pendingAttachment.type === 'url' ? 'URL' : pendingAttachment.mimeType})</span>
            </div>
          <button onClick={clearPendingAttachment} className="ml-2 text-slate-400 hover:text-red-400 p-1.5 rounded-full hover:bg-slate-600/70 transition-colors shrink-0" title="Hủy đính kèm">
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {showUrlInput && enableAttachments && (
        <div className="my-2 p-3 bg-slate-700/90 border border-slate-600/80 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-lg animate-fadeInUp animation-delay-0">
            <input 
                type="url"
                value={urlInputValue}
                onChange={handleUrlInputChange}
                onKeyDown={handleUrlInputKeyDown}
                placeholder="Dán URL (vd: https://abaii.vn)"
                className="flex-grow w-full sm:w-auto px-3.5 py-2.5 bg-slate-600/70 border border-slate-500/80 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-400 transition-all text-slate-100 placeholder-slate-400 text-sm"
                disabled={isLoading}
            />
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleAttachUrl}
                    disabled={isLoading || !urlInputValue.trim()}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-sky-500 text-white rounded-md shadow-md hover:bg-sky-600 disabled:bg-slate-500/80 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                >
                    Đính kèm
                </button>
                <button
                    type="button"
                    onClick={() => { setShowUrlInput(false); setUrlInputValue(''); }}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none p-2.5 bg-slate-500/90 text-slate-300 rounded-md shadow hover:bg-slate-500 disabled:opacity-70 transition-colors"
                    title="Hủy"
                >
                    <XCircleIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="mt-auto bg-slate-800/70 backdrop-blur-md border-t border-slate-700/70 rounded-b-xl shadow-xl flex flex-wrap items-end gap-2 p-2 sm:p-3">
        {(enableAttachments || enableVoiceInput) && (
          <div className="flex items-center gap-2">
            {enableAttachments && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden"
                  accept="image/*,application/pdf,.txt,.md,audio/*,video/*"
                />
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowUrlInput(false); 
                  }}
                  disabled={isLoading}
                  className="p-3 bg-slate-700/80 text-slate-300 rounded-lg hover:bg-slate-600/90 hover:text-sky-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  title="Đính kèm tệp (PDF, TXT, Ảnh, Âm thanh, Video)"
                >
                  <PaperClipIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUrlInput(!showUrlInput);
                    if (!showUrlInput) { setPendingAttachment(null); setUrlInputValue(''); }
                  }}
                  disabled={isLoading}
                  className={`p-3 rounded-lg transition-all duration-200 shadow-sm ${showUrlInput ? 'bg-sky-500 text-white' : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/90 hover:text-sky-300'} disabled:opacity-60 disabled:cursor-not-allowed`}
                  title="Đính kèm URL"
                >
                  <LinkIcon className="h-5 w-5" />
                </button>
              </>
            )}
            {enableVoiceInput && (
                <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={isLoading || !isSpeechRecognitionSupported}
                    className={`p-3 rounded-lg transition-all duration-200 shadow-sm ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/90 hover:text-sky-300'} disabled:opacity-60 disabled:cursor-not-allowed`}
                    title={isRecording ? "Dừng ghi âm" : "Ghi âm yêu cầu"}
                >
                    <MicrophoneIcon className="h-5 w-5" />
                </button>
            )}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`Yêu cầu cho ABAII...`}
          className="flex-grow px-3.5 py-3 bg-slate-700/80 border border-slate-600/90 rounded-lg shadow-inner 
                     focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500 focus:bg-slate-700
                     transition-all duration-200 text-slate-100 placeholder-slate-400 
                     resize-none custom-scrollbar text-sm sm:text-base max-h-32" 
          rows={1} 
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || (inputMessage.trim() === '' && !pendingAttachment)}
          className="p-3 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white rounded-lg shadow-lg 
                     hover:from-sky-400 hover:via-blue-500 hover:to-indigo-500 hover:shadow-sky-500/40
                     disabled:bg-slate-600/80 disabled:shadow-none disabled:cursor-not-allowed 
                     transition-all duration-200 self-stretch flex items-center justify-center aspect-square
                     transform hover:scale-105 active:scale-95"
          aria-label="Gửi tin nhắn"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-400 rounded-full animate-spin"></div>
          ) : <PaperAirplaneIcon className="h-5 w-5 transform -rotate-0 " />}
        </button>
      </form>

      {exportableChatContent && exportChatFilename && (
        <div className="flex justify-end mt-3">
          <ExportButton
            content={exportableChatContent}
            filename={exportChatFilename}
            buttonText="Xuất Hội thoại (.docx)"
            disabled={chatHistory.filter(m => m.role === 'user').length === 0}
            className="px-4 py-2 rounded-lg bg-slate-700/80 hover:bg-slate-600/90 text-slate-200 hover:text-sky-300 transition-all duration-200 flex items-center text-xs sm:text-sm font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed group focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
