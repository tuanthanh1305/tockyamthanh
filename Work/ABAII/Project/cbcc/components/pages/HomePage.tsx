

import React, { useState, useEffect } from 'react';
import { FeatureDetail, SimplifiedFeatureKey } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowPathIcon, ArrowRightCircleIcon, CpuChipIcon, ShieldCheckIcon, UserPlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ActionButton from '../ui/ActionButton'; 
import InputWithLabel from '../ui/InputWithLabel';

interface HomePageProps {
  features: FeatureDetail[];
  onSelectFeature: (featureKey: SimplifiedFeatureKey) => void;
}

const HomePage: React.FC<HomePageProps> = ({ features, onSelectFeature }) => {
  const { isAuthenticated, loginWithName, isLoading: isAuthLoading, user } = useAuth();
  const [name, setName] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const [elementsVisible, setElementsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setElementsVisible(true);
    }, 100); 
    return () => clearTimeout(timer);
  }, []);

  const handleFeatureClick = (feature: FeatureDetail) => {
    if (feature.externalUrl) {
      window.open(feature.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (isAuthenticated) {
      onSelectFeature(feature.key);
    } else {
      setInputError("Vui lòng nhập tên để tiếp tục.");
    }
  };

  const handleAccess = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setInputError("Tên không được để trống. Vui lòng nhập họ và tên của bạn.");
      return;
    }
    setInputError(null);
    setIsProcessingLogin(true);
    try {
      await loginWithName(name);
    } catch (error) {
      setInputError("Đăng nhập thất bại. Có lỗi xảy ra, vui lòng thử lại.");
      console.error("Login error:", error);
    } finally {
      setIsProcessingLogin(false);
    }
  };
  
  const greetingName = user?.name ? `, ${user.name}` : '';

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-2 sm:p-4 text-center min-h-full">
      <div 
        className={`mb-6 sm:mb-8 md:mb-10 transition-all duration-1000 ease-out ${elementsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="relative inline-block mb-5 sm:mb-6">
            <CpuChipIcon className="h-20 w-20 sm:h-24 sm:w-24 text-sky-400 mx-auto filter_cyber_glow animate-pulse-glow" />
            <div className="absolute inset-0 border-2 border-sky-500/20 rounded-full animate-subtle-ping opacity-70"></div>
            <div className="absolute -inset-2 border border-sky-600/10 rounded-full animate-subtle-ping animation-delay-500 opacity-50"></div>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-2 sm:mb-3">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-sky-400 to-blue-500">
            Trợ lý AI cho Cán bộ, Công chức
          </span>
           <span className="block text-xl sm:text-3xl md:text-4xl text-green-400 tracking-widest mt-1">ABAII</span>
        </h1>
        <p className="mt-2 sm:mt-3 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto">
          {isAuthenticated 
            ? `Chào mừng trở lại${greetingName}! Chọn một chức năng để bắt đầu hành trình số.`
            : "Nâng cao hiệu suất công việc với công cụ AI tiên tiến, bảo mật và cá nhân hóa cho cán bộ, công chức Việt Nam."
          }
        </p>
      </div>

      {(!isAuthenticated && !isAuthLoading) && (
        <form 
          onSubmit={handleAccess}
          className={`w-full max-w-md p-5 sm:p-6 glass-pane rounded-xl shadow-2xl
                      transition-all duration-1000 ease-out delay-300 ${elementsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="flex items-center justify-center mb-4 sm:mb-5">
            <ShieldCheckIcon className="h-9 w-9 sm:h-10 sm:w-10 text-green-400 mr-3 filter drop-shadow(0 0 5px rgba(74,222,128,0.5))"/>
            <p className="text-lg sm:text-xl text-slate-100 font-semibold">Xác thực Truy cập</p>
          </div>
          <InputWithLabel
              id="userName"
              label="Họ và Tên Đầy đủ"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="Ví dụ: Trần Tuấn Thành"
              disabled={isProcessingLogin}
              required
              className="text-base"
            />
            {inputError && <p className="text-sm text-red-400 -mt-3 mb-3 text-left px-1">{inputError}</p>}
          <ActionButton
              type="submit"
              text="Kết nối Hệ thống"
              onClick={() => handleAccess()}
              isLoading={isProcessingLogin}
              disabled={isProcessingLogin || !name.trim()}
              icon={!isProcessingLogin ? <UserPlusIcon className="h-5 w-5" /> : undefined}
              className="w-full !py-3 text-base mt-1 shadow-sky-500/40 hover:shadow-sky-400/60"
            />
            <p className="text-xs text-slate-400 mt-4">Thông tin của bạn được dùng để cá nhân hóa trải nghiệm trên Hệ thống ABAII.</p>
        </form>
      )}

      {(isAuthLoading || (isProcessingLogin && !isAuthenticated)) && (
        <div className={`mt-6 flex flex-col items-center justify-center text-slate-300 text-lg transition-opacity duration-500 ${elementsVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative flex items-center justify-center mb-3">
            <ArrowPathIcon className="animate-spin h-8 w-8 text-sky-400" />
            <div className="absolute h-12 w-12 border-2 border-sky-500/20 rounded-full animate-subtle-ping"></div>
          </div>
          Đang xác thực và tải tài nguyên...
        </div>
      )}

      {isAuthenticated && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 w-full max-w-6xl mt-6 sm:mt-8 
                        transition-all duration-1000 ease-out delay-200 ${elementsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          {features.map((feature, index) => (
            <div
              key={feature.key}
              style={{ animationDelay: `${index * 120}ms` }}
              className={`group glass-pane p-5 sm:p-6 rounded-xl shadow-xl 
                        hover:border-sky-400/70 hover:shadow-[0_0_25px_rgba(56,189,248,0.3)] transition-all duration-300 ease-in-out 
                        transform hover:-translate-y-2 hover:scale-[1.02] opacity-0 animate-fadeInUp flex flex-col`}
            >
              <div className="flex-shrink-0 flex flex-col items-center text-center">
                <div className="p-3 mb-4 bg-sky-500/10 rounded-full inline-block group-hover:bg-sky-500/20 transition-colors relative">
                  <feature.icon className="h-9 w-9 sm:h-10 sm:w-10 text-sky-300 group-hover:text-sky-200 transition-transform duration-300 group-hover:scale-110" />
                  <div className="absolute inset-0 rounded-full border border-sky-500/30 group-hover:border-sky-400/50 animate-subtle-ping group-hover:animate-none transition-all"></div>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-50 group-hover:text-sky-300 transition-colors mb-2">
                  {feature.title}
                </h2>
                <p className="text-sm text-slate-300 group-hover:text-slate-200 mb-5 flex-grow">
                  {feature.description}
                </p>
              </div>
              <button
                onClick={() => handleFeatureClick(feature)}
                className="mt-auto w-full flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 text-white font-semibold rounded-lg shadow-lg 
                          hover:from-sky-500 hover:via-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-sky-400 
                          transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-sky-500/40"
              >
                Truy cập <ChevronRightIcon className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <p className={`mt-10 sm:mt-12 text-xs text-slate-500 transition-opacity duration-1000 delay-500 ${elementsVisible ? 'opacity-100' : 'opacity-0'}`}>
        Hệ thống được phát triển bởi Bộ phận Đào tạo - Viện Công nghệ Blockchain và Trí tuệ Nhân tạo ABAII.
      </p>
    </div>
  );
};

export default HomePage;