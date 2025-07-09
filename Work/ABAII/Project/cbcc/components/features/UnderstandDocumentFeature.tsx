

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import GeneratedOutput from '../ui/GeneratedOutput';
import ErrorMessage from '../ui/ErrorMessage';
import UrlListDisplay from '../ui/UrlListDisplay';
import ChatInterface from '../ui/ChatInterface';
import { analyzeDocument, generateChatResponse, DETAILED_SYSTEM_INSTRUCTION_ANALYZE_DOCUMENT, FOLLOW_UP_SYSTEM_INSTRUCTION_ANALYZE_DOCUMENT, AnalysisInput } from '../../services/geminiService';
import { DocumentAnalysisResult, ChatMessage, SimplifiedFeatureKey, ChatMessageAttachment, ChatGenerationContent } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { loadChatHistory, saveChatHistory } from '../../services/dbService';
import { ArrowPathIcon as LoadingIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';

const featureKey = SimplifiedFeatureKey.AnalyzeDocument;

const UnderstandDocumentFeature: React.FC = () => {
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [error, setError] = useState<string | null>(null);
  
  const { user, isAuthenticated } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const hasLoadedHistory = useRef(false);

  const initializeNewChat = (): ChatMessage[] => {
    const initialSystemMessage: ChatMessage = { 
      id: 'system-init-analysis', 
      role: 'system', 
      content: DETAILED_SYSTEM_INSTRUCTION_ANALYZE_DOCUMENT, 
      timestamp: new Date() 
    };
    const initialGreetingModelMessage: ChatMessage = {
      id: 'model-greeting-analysis',
      role: 'model',
      content: "Xin chào! Đây là chức năng Phân tích văn bản. Hãy cung cấp yêu cầu, dán nội dung, tải tệp (PDF, TXT, Ảnh, Âm thanh, Video...) hoặc URL để AI phân tích và hỗ trợ bạn.",
      timestamp: new Date()
    };
    return [initialSystemMessage, initialGreetingModelMessage];
  };

  useEffect(() => {
    if (isAuthenticated && user && !hasLoadedHistory.current) {
      setIsLoading(true); 
      loadChatHistory(user.id, featureKey).then(history => {
        if (history && history.length > 0) {
          setChatHistory(history);
          
          const lastModelResponseWithAnalysisData = history
            .slice() 
            .reverse() 
            .find(m => m.role === 'model' && !m.isLoading && m.analysisData);
          
          if(lastModelResponseWithAnalysisData && lastModelResponseWithAnalysisData.analysisData) {
              setAnalysisResult(lastModelResponseWithAnalysisData.analysisData);
          }
        } else {
            setChatHistory(initializeNewChat());
        }
        hasLoadedHistory.current = true;
      }).catch((err) => {
        console.error("Error loading chat history for AnalyzeDocument:", err);
        setChatHistory(initializeNewChat());
        hasLoadedHistory.current = true;
      }).finally(() => {
        setIsLoading(false);
      });
    } else if (!isAuthenticated) {
      setChatHistory([]);
      setAnalysisResult(null);
      hasLoadedHistory.current = false;
      setIsLoading(false); 
    } else if (isAuthenticated && user && hasLoadedHistory.current) {
        if (isLoading) setIsLoading(false);
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

  const handleSendChatMessage = async (messageContent: string, attachment?: ChatMessageAttachment) => {
    if (!isAuthenticated || !user) {
        setError("Phiên làm việc hết hạn hoặc lỗi xác thực. Vui lòng đăng nhập lại.");
        return;
    }
    setError(null);

    const newUserMessage: ChatMessage = { 
        id: `user-${Date.now()}`, 
        role: 'user', 
        content: messageContent, 
        timestamp: new Date(),
        attachment: attachment
    };
    
    // Determine if this is the first analysis request in the current session.
    const isInitialAnalysis = chatHistory.filter(msg => msg.role === 'user').length === 0;

    // IMPORTANT: Update chat history for the UI immediately.
    // The `chatHistory` variable in this function's scope will remain the "old" history
    // which is needed for the API call in the 'else' block.
    const currentChatWithUserMsg = [...chatHistory, newUserMessage];
    setChatHistory(currentChatWithUserMsg);

    const tempModelMessageId = `model-loading-${Date.now()}`;
    setChatHistory(prev => [...prev, { id: tempModelMessageId, role: 'model', content: "AI đang xử lý...", timestamp: new Date(), isLoading: true }]);

    // Rerouted logic: Use the powerful analysis API for ANY message with an attachment,
    // or for the very first message. Use the chat API for subsequent text-only messages.
    if (attachment || isInitialAnalysis) {
        setIsLoading(true);
        if(isInitialAnalysis) {
            setAnalysisResult(null); 
        }

        let analysisInput: AnalysisInput | null = null;
        
        if (attachment) {
          if ((attachment.type === 'file' || attachment.type === 'image') && attachment.mimeType && attachment.data) {
            analysisInput = {
              base64Data: attachment.data,
              mimeType: attachment.mimeType,
              fileName: attachment.name || 'attached_file',
            };
          } else if (attachment.type === 'url' && attachment.data) {
            analysisInput = { url: attachment.data };
          }
        } else {
            analysisInput = messageContent; 
        }

        if (!analysisInput && !messageContent.trim()) {
            setError("Nội dung trống. Vui lòng cung cấp văn bản, tệp, hoặc URL để phân tích.");
            setChatHistory(prev => prev.filter(msg => msg.id !== tempModelMessageId && msg.id !== newUserMessage.id)); 
            setIsLoading(false);
            return;
        }
        
        try {
            // The analyzeDocument function is now context-free and guarantees a clean API call.
            const result = await analyzeDocument(analysisInput!, messageContent || "Phân tích tài liệu đính kèm."); 
            setAnalysisResult(result);

            const modelResponseMessage: ChatMessage = {
                id: `model-resp-${Date.now()}`,
                role: 'model',
                content: result.tasks, 
                timestamp: new Date(),
                analysisData: result, 
            };
            setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? modelResponseMessage : msg));

        } catch (e: any) {
           const errorMessageText = (typeof e === 'string') ? e : (e.message || 'Không thể kết nối hoặc AI gặp sự cố.');
           setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? { ...msg, isLoading: false, role: 'model', content: `Lỗi phân tích: ${errorMessageText}` } : msg));
           setError(`Lỗi phân tích: ${errorMessageText}`);
        } finally {
            setIsLoading(false); 
        }

    } else { // Follow-up text-only conversation
        setIsChatLoading(true); 
        const chatContentForAPI: ChatGenerationContent = { text: messageContent, attachment };
        try {
            // Use the specific follow-up instruction for natural conversation.
            // Pass the `chatHistory` from before the new user message was added.
            const rawResponseText = await generateChatResponse(chatHistory, chatContentForAPI, FOLLOW_UP_SYSTEM_INSTRUCTION_ANALYZE_DOCUMENT);
            
            const newModelMessage: ChatMessage = { id: `model-resp-${Date.now()}`, role: 'model', content: rawResponseText, timestamp: new Date() };
            setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? newModelMessage : msg));

        } catch (e: any) {
          const errorMessageText = (typeof e === 'string') ? e : (e.message || 'Không thể nhận phản hồi từ AI.');
          setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? { ...msg, isLoading: false, role: 'model', content: `Lỗi chat: ${errorMessageText}` } : msg));
          setError(`Lỗi chat: ${errorMessageText}`);
        } finally {
            setIsChatLoading(false); 
        }
    }
  };
  
  if (!isAuthenticated && !isLoading) { 
    return (
        <div className="text-center p-8 sm:p-10 flex-grow flex flex-col justify-center items-center bg-slate-800/50 glass-pane rounded-lg">
            <DocumentChartBarIcon className="h-16 w-16 text-sky-400/70 mb-4 filter_subtle_glow" />
            <p className="text-xl text-slate-200 mb-2 font-semibold">Yêu cầu Đăng nhập Hệ thống</p>
            <p className="text-slate-300">Vui lòng đăng nhập để sử dụng chức năng Phân tích Văn bản.</p>
        </div>
    );
  }

  if (isLoading && !hasLoadedHistory.current) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300 p-10">
        <div className="relative flex items-center justify-center mb-4">
            <LoadingIcon className="animate-spin h-10 w-10 text-sky-400" />
            <div className="absolute h-16 w-16 border-2 border-sky-500/20 rounded-full animate-subtle-ping"></div>
        </div>
        <p className="text-lg tracking-wide">Đang tải dữ liệu phân tích và chuẩn bị môi trường...</p>
      </div>
    );
  }

  const showInitialAnalysisOutput = analysisResult && analysisResult.tasks && !isLoading;

  return (
    <div className="flex flex-col h-full space-y-3 sm:space-y-4 w-full"> 
      <ErrorMessage message={error} />
      
      {showInitialAnalysisOutput && ( 
        <div className="flex-shrink-0 animate-fadeInUp w-full" style={{animationDelay: '100ms'}}> 
          <GeneratedOutput 
            text={analysisResult.tasks} 
            title="Kết quả Phân tích & Nhiệm vụ Đề xuất"
            fileNamePrefix="PhanTichVanBan_ABAII"
            isMarkdown={false}
          />
          <UrlListDisplay 
            extractedUrls={analysisResult.extractedUrlsFromText}
            groundingSources={analysisResult.groundingWebSources}
          />
        </div>
      )}
      
      <div className={`flex-grow flex flex-col min-h-0 w-full ${showInitialAnalysisOutput ? 'mt-1 sm:mt-2' : 'mt-0'}`}>
        <ChatInterface 
            chatHistory={chatHistory.filter(msg => msg.role !== 'system')} 
            onSendMessage={handleSendChatMessage}
            isLoading={isChatLoading || (isLoading && chatHistory.some(m => m.isLoading))} 
            featureTitle="Phân tích Văn bản"
            enableAttachments={true}
            enableVoiceInput={true}
            exportableChatContent={exportableChatContent}
            exportChatFilename={`HoiThoai_PhanTichVanBan_${new Date().toISOString().split('T')[0]}`}
        />
      </div>
    </div>
  );
};

export default UnderstandDocumentFeature;