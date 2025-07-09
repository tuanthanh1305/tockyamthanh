
import React, { useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CopyButtonProps {
  textToCopy: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick events
    if (copied) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Optionally show an error state
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all"
      title={copied ? "Đã sao chép!" : "Sao chép nội dung"}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-green-400" />
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4" />
      )}
    </button>
  );
};

export default CopyButton;
