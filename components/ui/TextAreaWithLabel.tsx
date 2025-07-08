
import React from 'react';

interface TextAreaWithLabelProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
}

const TextAreaWithLabel: React.FC<TextAreaWithLabelProps> = ({ 
  id, 
  label, 
  value, 
  onChange, 
  placeholder = '', 
  rows = 5,
  required = false,
  disabled = false
}) => {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-200 mb-2 tracking-wide">
        {label} {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-slate-700/60 border border-slate-600/80 rounded-lg shadow-sm 
                   focus:ring-2 focus:ring-sky-400 focus:border-sky-400 focus:outline-none focus:bg-slate-700/80
                   transition-all duration-200 ease-in-out text-slate-100 placeholder-slate-400/80 resize-y custom-scrollbar text-base
                   ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-600/40' : 'hover:border-slate-500/90'}`}
      />
    </div>
  );
};

export default TextAreaWithLabel;
