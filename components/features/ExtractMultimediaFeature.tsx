
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import GeneratedOutput from '../ui/GeneratedOutput';
import ErrorMessage from '../ui/ErrorMessage';
import ChatInterface from '../ui/ChatInterface';
import { generateChatResponse, MULTIMEDIA_EXTRACTION_SYSTEM_INSTRUCTION } from '../../services/geminiService';
import { ChatMessage, ChatMessageAttachment, SimplifiedFeatureKey, ChatGenerationContent } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { loadChatHistory, saveChatHistory } from '../../services/dbService';
import { ArrowPathIcon as LoadingIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

const featureKey = SimplifiedFeatureKey.ExtractMultimedia;

const ExtractMultimediaFeature: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const hasLoadedHistory = useRef(false);
  
  const latestModelResponseContent = chatHistory
    .filter(msg => msg.role === 'model' && !msg.isLoading && msg.content.trim() !== '' && !msg.content.startsWith("Xin chào! Đây là chức năng Trích xuất Đa phương tiện"))
    .pop()?.content || null;
  const outputTitle = "Kết quả Trích xuất & Phân tích Đa phương tiện:";

  const initializeNewChat = () => {
    const initialSystemMessage: ChatMessage = { 
      id: 'system-init-multimedia',
      role: 'system', 
      content: MULTIMEDIA_EXTRACTION_SYSTEM_INSTRUCTION, 
      timestamp: new Date() 
    };
    const initialGreetingModelMessage: ChatMessage = {
      id: 'model-greeting-multimedia',
      role: 'model',
      content: "Xin chào! Đây là chức năng Trích xuất Đa phương tiện. Vui lòng tải lên tệp âm thanh (MP3, WAV,...) để AI phiên âm và tóm tắt nội dung.",
      timestamp: new Date()
    };
    return [initialSystemMessage, initialGreetingModelMessage];
  };
  
  useEffect(() => {
    if (isAuthenticated && user && !hasLoadedHistory.current) {
      setIsChatLoading(true); 
      loadChatHistory(user.id, featureKey).then(history => {
        if (history && history.length > 0) {
          setChatHistory(history);
        } else {
          setChatHistory(initializeNewChat());
        }
        hasLoadedHistory.current = true;
      }).catch((err) => {
        console.error("Error loading chat history for ExtractMultimedia:", err);
        setChatHistory(initializeNewChat()); 
        hasLoadedHistory.current = true;
      }).finally(() => {
        setIsChatLoading(false);
      });
    } else if (!isAuthenticated) {
      setChatHistory([]); 
      hasLoadedHistory.current = false;
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user && chatHistory.length > 0 && hasLoadedHistory.current) {
      saveChatHistory(user.id, featureKey, chatHistory);
    }
  }, [chatHistory, isAuthenticated, user]);

  const exportableChatContent = useMemo(() => {
    return chatHistory
        .filter(msg => msg.role !== 'system' && !msg.isLoading)
        .map(msg => `[${new Date(msg.timestamp).toLocaleString('vi-VN')}] ${msg.role === 'user' ? user?.name || 'Bạn' : 'AI (ABAII)'}:\n${msg.content}`)
        .join('\n\n---\n\n');
  }, [chatHistory, user]);

  const handleSendChatMessage = async (messageText: string, attachment?: ChatMessageAttachment) => {
     if (!isAuthenticated || !user) {
       setError("Phiên làm việc hết hạn hoặc lỗi xác thực. Vui lòng đăng nhập lại.");
       return;
     }

    const newUserMessage: ChatMessage = { 
      id: `user-${Date.now()}`, 
      role: 'user', 
      content: messageText, 
      timestamp: new Date(),
      attachment: attachment 
    };

    const newHistoryWithUser = [...chatHistory, newUserMessage];
    setChatHistory(newHistoryWithUser); 
    setIsChatLoading(true);
    setError(null);
    
    const tempModelMessageId = `model-loading-${Date.now()}`;
    setChatHistory(prev => [...prev, { id: tempModelMessageId, role: 'model', content: "AI đang phân tích...", timestamp: new Date(), isLoading: true }]);

    const contentToGenerate: ChatGenerationContent = { text: messageText, attachment };
    const historyForApi = newHistoryWithUser;

    try {
      const responseText = await generateChatResponse(historyForApi, contentToGenerate, MULTIMEDIA_EXTRACTION_SYSTEM_INSTRUCTION);
      const newModelMessage: ChatMessage = { id: `model-resp-${Date.now()}`, role: 'model', content: responseText, timestamp: new Date() };
      setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? newModelMessage : msg));
      
    } catch (e: any) {
      const errorMessageText = (typeof e === 'string') ? e : (e.message || 'Không thể kết nối hoặc AI gặp sự cố.');
      setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? { ...msg, isLoading: false, role: 'model', content: `Lỗi trích xuất: ${errorMessageText}` } : msg));
      setError(`Lỗi khi yêu cầu trích xuất đa phương tiện: ${errorMessageText}`);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  if (!isAuthenticated && !isChatLoading) {
    return (
        <div className="text-center p-8 sm:p-10 flex-grow flex flex-col justify-center items-center bg-slate-800/50 glass-pane rounded-lg">
            <SpeakerWaveIcon className="h-16 w-16 text-sky-400/70 mb-4 filter_subtle_glow" />
            <p className="text-xl text-slate-200 mb-2 font-semibold">Yêu cầu Đăng nhập Hệ thống</p>
            <p className="text-slate-300">Vui lòng đăng nhập để sử dụng chức năng Trích xuất Đa phương tiện.</p>
        </div>
    );
  }
  
  if (isChatLoading && !hasLoadedHistory.current) { 
    return (
        <div className="flex flex-col items-center justify-center h-full text-slate-300 p-10">
            <div className="relative flex items-center justify-center mb-4">
                <LoadingIcon className="animate-spin h-10 w-10 text-sky-400" />
                <div className="absolute h-16 w-16 border-2 border-sky-500/20 rounded-full animate-subtle-ping"></div>
            </div>
            <p className="text-lg tracking-wide">Đang tải dữ liệu và chuẩn bị môi trường trích xuất...</p>
        </div>
    );
  }
  
  const showMultimediaOutput = latestModelResponseContent && !isChatLoading;

  return (
    <div className="h-full flex flex-col space-y-3 sm:space-y-4 w-full"> {/* Ensure full width */}
      <ErrorMessage message={error} />
      
      {showMultimediaOutput && (
        <div className="flex-shrink-0 animate-fadeInUp w-full" style={{animationDelay: '100ms'}}>
            <GeneratedOutput 
                text={latestModelResponseContent} 
                title={outputTitle}
                fileNamePrefix={"TrichXuatDaPhuongTien_ABAII"}
                isMarkdown={true}
            />
        </div>
      )}

      <div className={`flex-grow flex flex-col min-h-0 w-full ${showMultimediaOutput ? 'mt-1 sm:mt-2' : 'mt-0'}`}>
         <ChatInterface
          chatHistory={chatHistory.filter(msg => msg.role !== 'system')}
          onSendMessage={handleSendChatMessage}
          isLoading={isChatLoading}
          featureTitle={'Trích xuất Đa phương tiện'}
          enableAttachments={true}
          enableVoiceInput={true}
          exportableChatContent={exportableChatContent}
          exportChatFilename={`HoiThoai_TrichXuatDaPhuongTien_${new Date().toISOString().split('T')[0]}`}
        />
      </div>
    </div>
  );
};

export default ExtractMultimediaFeature;