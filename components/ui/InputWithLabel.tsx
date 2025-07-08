
import React from 'react';

interface InputWithLabelProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const InputWithLabel: React.FC<InputWithLabelProps> = ({ 
  id, 
  label, 
  value, 
  onChange, 
  placeholder = '', 
  type = 'text',
  required = false,
  disabled = false,
  className = ''
}) => {
  return (
    <div className="mb-5 sm:mb-6 w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-200 mb-2 text-left tracking-wide">
        {label} {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full px-4 py-3 bg-slate-700/60 border border-slate-600/80 rounded-lg shadow-sm 
                     text-slate-100 placeholder-slate-400/80 text-base
                     focus:ring-2 focus:ring-sky-400 focus:border-sky-400 focus:outline-none focus:bg-slate-700/80
                     transition-all duration-200 ease-in-out 
                     ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-600/40' : 'hover:border-slate-500/90'}
                     ${className}`}
        />
        {/* Optional: Add an icon or other elements inside the input relative container */}
      </div>
    </div>
  );
};

export default InputWithLabel;
