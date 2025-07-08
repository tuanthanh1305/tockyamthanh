

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ErrorMessage from '../ui/ErrorMessage';
import ChatInterface from '../ui/ChatInterface';
import { getNewsUpdate, NEWS_SYSTEM_INSTRUCTION } from '../../services/geminiService';
import { ChatMessage, SimplifiedFeatureKey, ChatMessageAttachment, NewsArticle } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { loadChatHistory, saveChatHistory } from '../../services/dbService';
import { ArrowPathIcon as LoadingIcon, NewspaperIcon } from '@heroicons/react/24/outline';

const featureKey = SimplifiedFeatureKey.NewsAI;

const NewsAIFeature: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const hasLoadedHistory = useRef(false);

  const initializeNewChat = () => {
    const initialSystemMessage: ChatMessage = { 
      id: 'system-init-news', 
      role: 'system', 
      content: NEWS_SYSTEM_INSTRUCTION, 
      timestamp: new Date() 
    };
    const initialGreetingModelMessage: ChatMessage = {
      id: 'model-greeting-news', 
      role: 'model',
      content: "Xin chào! Đây là AI Tin tức. Hãy nhập hoặc nói chủ đề bạn muốn tìm hiểu, ví dụ: 'tin tức mới nhất về công nghệ AI tại Việt Nam'.",
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
      }).catch(() => {
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
      .map(msg => {
        let messageBlock = `[${new Date(msg.timestamp).toLocaleString('vi-VN')}] ${msg.role === 'user' ? user?.name || 'Bạn' : 'AI (ABAII)'}:\n${msg.content}`;
        
        if (msg.newsArticles && msg.newsArticles.length > 0) {
            const articlesText = msg.newsArticles.map(article => 
                `Tiêu đề: ${article.title}\n` +
                (article.publication_date ? `Thời gian: ${article.publication_date}\n` : '') +
                `Nguồn: ${article.url}\n\n` +
                (article.summary ? `Tóm tắt:\n${article.summary}\n` : '')
            ).join('\n\n---\n\n');
            messageBlock += `\n\n--- TIN TỨC LIÊN QUAN ---\n${articlesText}`;
        }

        return messageBlock;
      })
      .join('\n\n---\n\n');
  }, [chatHistory, user]);

  const handleSendMessage = async (messageText: string, attachment?: ChatMessageAttachment) => {
    if (!isAuthenticated || !user) {
      setError("Phiên làm việc hết hạn. Vui lòng đăng nhập lại.");
      return;
    }
    if (attachment) {
      setError("Tính năng này không hỗ trợ tệp đính kèm. Vui lòng chỉ nhập chủ đề bằng văn bản.");
      return;
    }
    
    const newUserMessage: ChatMessage = { 
      id: `user-${Date.now()}`, 
      role: 'user', 
      content: messageText, 
      timestamp: new Date(),
    };

    const newHistoryWithUser = [...chatHistory, newUserMessage];
    setChatHistory(newHistoryWithUser);
    
    setIsChatLoading(true);
    setError(null);
    
    const tempModelMessageId = `model-loading-${Date.now()}`;
    setChatHistory(prev => [...prev, { id: tempModelMessageId, role: 'model', content: "AI đang tìm kiếm tin tức...", timestamp: new Date(), isLoading: true }]);

    try {
      const articles = await getNewsUpdate(messageText);
      const summaryText = articles.length > 0
        ? `Tôi đã tìm thấy ${articles.length} bài báo mới nhất liên quan đến chủ đề của bạn. Dưới đây là danh sách chi tiết. Bạn có muốn thảo luận thêm về tin tức nào không?`
        : `Rất tiếc, tôi không tìm thấy tin tức nào phù hợp với chủ đề "${messageText}". Vui lòng thử lại với một từ khóa khác.`;
      
      const newModelMessage: ChatMessage = { 
          id: `model-resp-${Date.now()}`, 
          role: 'model', 
          content: summaryText,
          timestamp: new Date(),
          newsArticles: articles,
      };
      setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? newModelMessage : msg));
    } catch (e: any) {
      const errorMessageText = (e.message || 'Không thể kết nối hoặc AI gặp sự cố.');
      setChatHistory(prev => prev.map(msg => msg.id === tempModelMessageId ? { ...msg, isLoading: false, role: 'model', content: `Lỗi: ${errorMessageText}` } : msg));
      setError(`Lỗi khi tìm kiếm tin tức: ${errorMessageText}`);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!isAuthenticated && !isChatLoading) { 
    return (
        <div className="text-center p-8 sm:p-10 flex-grow flex flex-col justify-center items-center bg-slate-800/50 glass-pane rounded-lg">
            <NewspaperIcon className="h-16 w-16 text-sky-400/70 mb-4 filter_subtle_glow" />
            <p className="text-xl text-slate-200 mb-2 font-semibold">Yêu cầu Đăng nhập Hệ thống</p>
            <p className="text-slate-300">Vui lòng đăng nhập để sử dụng chức năng AI Tin tức.</p>
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
            <p className="text-lg tracking-wide">Đang tải và chuẩn bị môi trường AI Tin tức...</p>
        </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col space-y-3 sm:space-y-4 w-full">
      <ErrorMessage message={error} />
        
      <div className={`flex-grow flex flex-col min-h-0 w-full mt-0`}>
         <ChatInterface
          chatHistory={chatHistory.filter(msg => msg.role !== 'system')}
          onSendMessage={handleSendMessage}
          isLoading={isChatLoading} 
          featureTitle={'AI Tin tức'}
          enableAttachments={false}
          enableVoiceInput={true}
          exportableChatContent={exportableChatContent}
          exportChatFilename={`HoiThoai_AITinTuc_${new Date().toISOString().split('T')[0]}`}
        />
      </div>
    </div>
  );
};

export default NewsAIFeature;