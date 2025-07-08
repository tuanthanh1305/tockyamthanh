
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import GeneratedOutput from '../ui/GeneratedOutput';
import ErrorMessage from '../ui/ErrorMessage';
import ChatInterface from '../ui/ChatInterface';
import { generateChatResponse, DRAFTING_CHATBOT_SYSTEM_INSTRUCTION } from '../../services/geminiService';
import { ChatMessage, ChatMessageAttachment, SimplifiedFeatureKey, ChatGenerationContent } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { loadChatHistory, saveChatHistory } from '../../services/dbService';
import { ArrowPathIcon as LoadingIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

const featureKey = SimplifiedFeatureKey.GenericDraft;

const GenericDraftFeature: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const hasLoadedHistory = useRef(false);
  
  const currentDraftText = chatHistory
    .filter(msg => msg.role === 'model' && !msg.isLoading && msg.content.trim() !== '' && !msg.content.startsWith("Xin chào! Đây là chức năng Soạn thảo văn bản."))
    .pop()?.content || null;
  const currentDraftTitle = "Văn bản Dự thảo Hiện tại:"

  const initializeNewChat = () => {
    const initialSystemMessage: ChatMessage = { 
      id: 'system-init-draft', 
      role: 'system', 
      content: DRAFTING_CHATBOT_SYSTEM_INSTRUCTION, 
      timestamp: new Date() 
    };
    const initialGreetingModelMessage: ChatMessage = {
      id: 'model-greeting-draft', 
      role: 'model',
      content: "Xin chào! Đây là chức năng Soạn thảo văn bản. Hãy cho tôi biết bạn muốn soạn loại văn bản nào (ví dụ: công văn, tờ trình, báo cáo...) và cung cấp các thông tin, tài liệu (nếu có) để AI hỗ trợ bạn.",
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
        console.error("Error loading chat history for GenericDraft:", err);
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
    setChatHistory(prev => [...prev, { id: tempModelMessageId, role: 'model', content: "AI đang soạn thảo...", timestamp: new Date(), isLoading: true }]);

    const contentToGenerate: ChatGenerationContent = { text: messageText, attachment };
    const historyForApi = newHistoryWithUser;

    try {
      const responseText = await generateChatResponse(historyForApi, contentToGenerate, DRAFTING_CHATBOT_SYSTEM_INSTRUCTION);
      const newModelMessage: ChatMessage = { id: `model-resp-${Date.now()}`, role: 'model', content: responseText, timestamp: new Date() };
      setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? newModelMessage : msg));
      
    } catch (e: any) {
      const errorMessageText = (typeof e === 'string') ? e : (e.message || 'Không thể kết nối hoặc AI gặp sự cố.');
      setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? { ...msg, isLoading: false, role: 'model', content: `Lỗi soạn thảo: ${errorMessageText}` } : msg));
      setError(`Lỗi khi yêu cầu soạn thảo: ${errorMessageText}`);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  if (!isAuthenticated && !isChatLoading) { 
    return (
        <div className="text-center p-8 sm:p-10 flex-grow flex flex-col justify-center items-center bg-slate-800/50 glass-pane rounded-lg">
            <PencilSquareIcon className="h-16 w-16 text-sky-400/70 mb-4 filter_subtle_glow" />
            <p className="text-xl text-slate-200 mb-2 font-semibold">Yêu cầu Đăng nhập Hệ thống</p>
            <p className="text-slate-300">Vui lòng đăng nhập để sử dụng chức năng Soạn thảo Văn bản.</p>
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
            <p className="text-lg tracking-wide">Đang tải dữ liệu soạn thảo và chuẩn bị môi trường...</p>
        </div>
    );
  }

  const showDraftOutput = currentDraftText && !isChatLoading;

  return (
    <div className="h-full flex flex-col space-y-3 sm:space-y-4 w-full"> {/* Ensure full width */}
      <ErrorMessage message={error} />
      
      {showDraftOutput && (
        <div className="flex-shrink-0 animate-fadeInUp w-full" style={{animationDelay: '100ms'}}>
            <GeneratedOutput 
                text={currentDraftText} 
                title={currentDraftTitle}
                fileNamePrefix={"VanBanSoanThao_ABAII"}
                isMarkdown={true}
            />
        </div>
      )}

      <div className={`flex-grow flex flex-col min-h-0 w-full ${showDraftOutput ? 'mt-1 sm:mt-2' : 'mt-0'}`}>
         <ChatInterface
          chatHistory={chatHistory.filter(msg => msg.role !== 'system')}
          onSendMessage={handleSendChatMessage}
          isLoading={isChatLoading} 
          featureTitle={'Soạn thảo Văn bản'}
          enableAttachments={true}
          enableVoiceInput={true}
          exportableChatContent={exportableChatContent}
          exportChatFilename={`HoiThoai_SoanThaoVanBan_${new Date().toISOString().split('T')[0]}`}
        />
      </div>
    </div>
  );
};

export default GenericDraftFeature;
