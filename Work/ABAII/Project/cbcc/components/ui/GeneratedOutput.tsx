
import React, { useState } from 'react';
import { ClipboardDocumentCheckIcon, CheckCircleIcon, DocumentArrowDownIcon as ExportIcon } from '@heroicons/react/24/solid'; // Using solid icons
import ExportButton from './ExportButton'; 
import { marked } from 'marked';
import { InformationCircleIcon } from '@heroicons/react/24/outline';


interface GeneratedOutputProps {
  text: string | null;
  title?: string;
  fileNamePrefix?: string;
  isMarkdown?: boolean;
}

const GeneratedOutput: React.FC<GeneratedOutputProps> = ({ 
  text, 
  title = "Kết quả từ AI", 
  fileNamePrefix = "AI_GeneratedDocument",
  isMarkdown = false
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.error('Không thể sao chép văn bản: ', err);
        alert('Lỗi: Không thể sao chép vào clipboard. Vui lòng thử lại hoặc sao chép thủ công.');
      }
    }
  };

  if (!text) {
    return (
        <div className="mt-5 sm:mt-6 glass-pane p-4 sm:p-5 rounded-xl shadow-xl border-sky-500/20">
            <div className="flex flex-col items-center justify-center text-slate-400 py-8">
                <InformationCircleIcon className="h-12 w-12 text-sky-500/60 mb-3"/>
                <p className="text-lg font-medium">Chưa có kết quả từ AI</p>
                <p className="text-sm">Vui lòng tương tác với AI để nhận phản hồi.</p>
            </div>
        </div>
    );
  }
  
  const formattedFileName = `${fileNamePrefix}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;

  return (
    <div className="mt-5 sm:mt-6 glass-pane p-4 sm:p-5 rounded-xl shadow-xl border-sky-500/20">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 sm:mb-4 gap-3">
        <h3 className="text-lg sm:text-xl font-semibold text-gradient-cyber flex items-center">
          <ExportIcon className="h-6 w-6 mr-2.5 text-sky-400/90" />
          {title}
        </h3>
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <button
            onClick={handleCopy}
            title="Sao chép toàn bộ nội dung"
            disabled={!text}
            className={`px-3 py-2 rounded-lg bg-slate-700/70 hover:bg-slate-600/80 text-slate-300 hover:text-sky-300 
                        transition-all duration-200 flex items-center text-xs sm:text-sm shadow-md
                        disabled:opacity-50 disabled:cursor-not-allowed group focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800`}
          >
            {copied ? 
              <CheckCircleIcon className="h-5 w-5 text-green-400 transition-all duration-150 transform scale-110" /> : 
              <ClipboardDocumentCheckIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
            }
            <span className="ml-1.5 sm:ml-2 font-medium">{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
          </button>
          <ExportButton 
            content={text} 
            filename={formattedFileName} 
            buttonText="Xuất DOCX"
            className="px-3 py-2 rounded-lg bg-slate-700/70 hover:bg-slate-600/80 text-slate-300 hover:text-sky-300 
                       transition-all duration-200 flex items-center text-xs sm:text-sm shadow-md
                       disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
          />
        </div>
      </div>
      <div className="p-3.5 sm:p-4 bg-slate-900/80 border border-slate-700/70 rounded-lg shadow-inner max-h-[30rem] lg:max-h-[40rem] overflow-y-auto custom-scrollbar">
        {isMarkdown ? (
            <div 
              className="prose prose-sm sm:prose-base prose-invert max-w-none break-words
                         prose-headings:text-sky-300 prose-a:text-sky-400 prose-strong:text-slate-100
                         prose-code:text-amber-300 prose-code:bg-slate-700/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                         prose-pre:bg-slate-800/60 prose-pre:p-3 prose-pre:rounded-md prose-pre:custom-scrollbar prose-pre:border prose-pre:border-slate-700/50
                         [&_p]:my-2.5 [&_ul]:my-2.5 [&_ol]:my-2.5 
                         [&_h1]:text-xl [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:mb-1.5"
              dangerouslySetInnerHTML={{ __html: marked.parse(text) as string }} 
            />
        ) : (
            <pre className="whitespace-pre-wrap text-sm sm:text-base text-slate-200 break-words font-sans leading-relaxed">{text}</pre>
        )}
      </div>
    </div>
  );
};

export default GeneratedOutput;
