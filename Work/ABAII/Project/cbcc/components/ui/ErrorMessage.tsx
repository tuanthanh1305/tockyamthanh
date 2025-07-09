
import React from 'react';
import { ShieldExclamationIcon } from '@heroicons/react/24/solid'; 

interface ErrorMessageProps {
  message: string | null;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  let displayMessage = message;
  if (message.toLowerCase().includes("api key not valid") || message.toLowerCase().includes("api key không hợp lệ")) {
    displayMessage = "Lỗi cấu hình hệ thống: API Key không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ quản trị viên để khắc phục.";
  } else if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("networkerror")) {
    displayMessage = "Lỗi kết nối mạng: Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra kết nối internet của bạn và thử lại.";
  } else if (message.toLowerCase().includes("resource has been exhausted") || message.toLowerCase().includes("quota")) {
     displayMessage = "Hệ thống tạm thời quá tải hoặc đã đạt giới hạn yêu cầu. Vui lòng thử lại sau ít phút.";
  }


  return (
    <div className="my-3 sm:my-4 p-4 bg-red-800/40 border border-red-600/60 text-red-200 rounded-lg shadow-lg flex items-start space-x-3 animate-fadeInUp backdrop-blur-sm">
      <ShieldExclamationIcon className="h-8 w-8 sm:h-10 sm:w-10 text-red-400 flex-shrink-0 mt-0.5 filter drop-shadow(0 0 4px rgba(248,113,113,0.6))" />
      <div>
        <h4 className="font-semibold text-red-200 text-base sm:text-lg tracking-wide">Thông Báo Lỗi Hệ Thống ABAII</h4>
        <p className="text-sm sm:text-base mt-1 leading-relaxed">{displayMessage}</p>
      </div>
    </div>
  );
};

export default ErrorMessage;
