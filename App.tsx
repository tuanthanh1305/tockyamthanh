



import React, { useState, useMemo, useEffect } from 'react';
import { SimplifiedFeatureKey, FeatureDetail } from './types';
import FeatureRenderer from './components/FeatureRenderer';
import HomePage from './components/pages/HomePage'; // Import HomePage
import { useAuth } from './contexts/AuthContext';
import {
  DocumentMagnifyingGlassIcon,
  PencilSquareIcon,
  CpuChipIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon, // Changed from PowerIcon for standard logout
  SpeakerWaveIcon,
  NewspaperIcon, // Changed from MicrophoneIcon
  QueueListIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
// import ElevenLabsWidget from './components/ui/AudioVisualizer'; // Temporarily removed due to external service error

const allFeatureDetails: FeatureDetail[] = [
  {
    key: SimplifiedFeatureKey.AnalyzeDocument,
    title: 'Phân tích Văn bản',
    description: 'Nạp văn bản, URL hoặc dán nội dung để AI tóm tắt, trích xuất thông tin, xác định nhiệm vụ và tìm kiếm các nguồn liên quan.',
    icon: DocumentMagnifyingGlassIcon,
  },
  {
    key: SimplifiedFeatureKey.GenericDraft,
    title: 'Soạn thảo Văn bản',
    description: 'Yêu cầu AI soạn thảo các loại công văn, tờ trình, báo cáo, kế hoạch... theo chuẩn thể thức và nội dung bạn cung cấp.',
    icon: PencilSquareIcon,
  },
  {
    key: SimplifiedFeatureKey.ExtractMultimedia,
    title: 'Trích xuất Đa phương tiện',
    description: 'Phiên âm, tóm tắt nội dung từ tệp âm thanh (MP3, WAV,...).',
    icon: SpeakerWaveIcon,
  },
  {
    key: SimplifiedFeatureKey.NewsAI,
    title: 'AI Tin tức',
    description: 'Nhập chủ đề bạn quan tâm, AI sẽ cung cấp tin tức mới nhất từ các nguồn uy tín, kèm theo trích dẫn cụ thể.',
    icon: NewspaperIcon,
  },
  {
    key: SimplifiedFeatureKey.LiveTranscription,
    title: 'Tốc ký âm thanh',
    description: 'Chuyển lời nói thành văn bản dễ dàng. Dù là lời nói bằng tiếng Anh, nội dung vẫn được chuyển sang tiếng Việt. Mọi lời nói được chuyển đổi thành ghi chép rõ ràng, chính xác và dễ hiểu. (Lưu ý: Để đảm bảo chất lượng, nên ghi âm dưới 20 phút).',
    icon: QueueListIcon,
  },
  {
    key: SimplifiedFeatureKey.AILawLookup,
    title: 'AI Tra cứu Luật',
    description: 'Truy cập hệ thống tra cứu văn bản quy phạm pháp luật ứng dụng AI, giúp tìm kiếm và phân tích thông tin pháp lý nhanh chóng.',
    icon: ScaleIcon,
    externalUrl: 'https://aitracuuluat.vn/',
  }
];

type AppView = 'home' | SimplifiedFeatureKey;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const { user, isAuthenticated, logout, isLoading: isAuthLoading } = useAuth();

  const handleFeatureSelect = (featureKey: SimplifiedFeatureKey) => {
    if (isAuthenticated) {
      setCurrentView(featureKey);
    } else {
      setCurrentView('home'); 
    }
  };

  const handleGoHome = () => {
    setCurrentView('home');
  };

  const currentFeatureDetail = useMemo(() => {
    if (currentView === 'home') return null;
    return allFeatureDetails.find(f => f.key === currentView);
  }, [currentView]);

  if (isAuthLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <CpuChipIcon className="h-24 w-24 sm:h-28 sm:w-28 text-sky-400 filter_cyber_glow" />
          <div className="absolute h-32 w-32 sm:h-36 sm:w-36 border-2 border-sky-500/30 rounded-full animate-pulse-glow"></div>
          <div className="absolute h-40 w-40 sm:h-48 sm:w-48 border border-sky-500/20 rounded-full animate-subtle-ping"></div>
        </div>
        <p className="mt-8 text-xl sm:text-2xl text-slate-300 font-medium tracking-wider">Đang khởi tạo Hệ thống ABAII...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen text-slate-100 antialiased"> {/* Removed base gradient, handled by body */}
      <header className="bg-slate-900/60 backdrop-blur-xl shadow-2xl shadow-sky-900/30 px-4 py-2 sm:p-3 sticky top-0 z-50 border-b border-slate-700/70">
        <div className="container mx-auto flex flex-col sm:flex-row justify-center sm:justify-between items-center max-w-screen-xl gap-y-2 sm:gap-y-0">
          <button
            onClick={handleGoHome}
            className="flex items-center space-x-2 sm:space-x-3 group"
            aria-label="Trang chủ ABAII"
          >
            <div className="p-1.5 sm:p-2 bg-slate-800 rounded-lg shadow-lg group-hover:bg-sky-500/20 transition-all duration-300 relative overflow-hidden">
              <CpuChipIcon className="h-6 w-6 sm:h-8 sm:w-8 text-sky-400 group-hover:text-sky-300 transition-colors duration-300 transform group-hover:scale-110 filter_subtle_glow" />
               <div className="absolute -bottom-1 -left-1 w-1/2 h-1.5 bg-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full transform group-hover:translate-x-1/2 group-hover:w-full"></div>
            </div>
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left justify-center">
                <h1 className="text-sm sm:text-lg lg:text-xl font-bold tracking-tight text-gradient-cyber group-hover:brightness-125 transition duration-300">
                Trợ lý AI cho Cán bộ, Công chức
                </h1>
                <span className="text-sm sm:text-lg lg:text-xl font-bold text-green-400 group-hover:text-green-300 transition-colors duration-300 tracking-widest">
                ABAII
                </span>
            </div>
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center space-x-2 p-1.5 sm:p-2 bg-slate-800/80 rounded-lg shadow-md hover:bg-slate-700/70 transition-colors">
                  <UserCircleIcon className="h-5 w-5 sm:h-7 sm:w-7 text-sky-400" />
                  <span className="hidden sm:inline text-sm font-medium text-slate-200">{user.name}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setCurrentView('home'); 
                  }}
                  className="p-1.5 sm:p-2.5 rounded-lg text-slate-400 bg-slate-800/80 shadow-md hover:bg-red-500/30 hover:text-red-300 transition-all duration-300 group"
                  title="Đăng xuất"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 sm:h-6 sm:w-6 transform group-hover:scale-110 transition-transform" />
                </button>
              </>
            ) : (
              <div className="hidden sm:block sm:h-11"></div> 
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col container mx-auto overflow-hidden max-w-screen-xl w-full p-4 sm:p-6">
        {currentView === 'home' || !isAuthenticated ? (
          <HomePage features={allFeatureDetails} onSelectFeature={handleFeatureSelect} />
        ) : currentFeatureDetail ? ( 
          <div className="py-2 sm:py-4 flex-grow flex flex-col">
            <FeatureRenderer feature={currentFeatureDetail} />
          </div>
        ) : ( 
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-10 glass-pane rounded-xl">
            <CpuChipIcon className="h-20 w-20 text-sky-500/70 mb-5 filter_subtle_glow" />
            <h2 className="text-2xl font-semibold mb-2 text-slate-100">Lỗi Chức Năng</h2>
            <p>Không tìm thấy chức năng được chọn. Vui lòng quay lại trang chủ.</p>
             <button
              onClick={handleGoHome}
              className="mt-8 px-8 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-sky-500/40 transition-all duration-300"
            >
              Về Trang Chủ
            </button>
          </div>
        )}
      </main>

      {/* {isAuthenticated && <ElevenLabsWidget />} */}
    </div>
  );
};

export default App;