
import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';

interface ActionButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  isLoading: boolean;
  disabled?: boolean;
  text: string;
  icon?: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  onClick, 
  isLoading, 
  disabled, 
  text, 
  icon,
  className = "",
  type = "button"
}) => {
  const isDisabled = isLoading || disabled;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full flex items-center justify-center px-5 py-3 sm:px-6 border border-transparent 
                  text-base font-semibold rounded-lg shadow-lg text-white 
                  transition-all duration-300 ease-in-out transform hover:scale-[1.03] active:scale-100 
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-sky-400
                  tracking-wider
                  ${isDisabled 
                    ? 'bg-slate-600/70 cursor-not-allowed opacity-70 shadow-inner' 
                    : 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:via-blue-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-sky-500/30'} 
                  ${className}`}
    >
      {isLoading ? (
        <>
          <ArrowPathIcon className="animate-spin h-5 w-5 mr-3 text-slate-100" />
          <span className="text-slate-100">Đang xử lý...</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2.5 text-slate-100">{icon}</span>}
          <span className="text-white">{text}</span>
        </>
      )}
    </button>
  );
};

export default ActionButton;
