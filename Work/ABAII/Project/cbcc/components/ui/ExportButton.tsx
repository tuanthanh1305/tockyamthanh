import React from 'react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import saveAs from 'file-saver'; 
import { DocumentArrowDownIcon } from '@heroicons/react/24/solid'; // Using solid for consistency with other action icons

interface ExportButtonProps {
  content: string | null;
  filename: string;
  buttonText?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}

const cleanTextForExport = (text: string | null): string => {
  if (!text) return '';
  let cleanedText = text;

  // 1. Remove ABAII Footer
  const footerRegex = /---[\r\n\s]+Trợ lý được tạo bởi:[\s\S]*/gm;
  cleanedText = cleanedText.replace(footerRegex, '');

  // 2. Remove HTML tags
  cleanedText = cleanedText.replace(/<[^>]*>/g, '');

  // 3. Remove Markdown formatting
  // Headings (e.g., #, ##) and remove optional trailing colon. "### Title:" -> "Title"
  cleanedText = cleanedText.replace(/^#{1,6}\s*(.*?):?\s*$/gm, '$1');

  // Bold and Italic
  cleanedText = cleanedText.replace(/(\*\*|__)(.*?)\1/g, '$2');
  cleanedText = cleanedText.replace(/(\*|_)(.*?)\1/g, '$2');

  // Strikethrough
  cleanedText = cleanedText.replace(/~~(.*?)~~/g, '$1');

  // Blockquotes
  cleanedText = cleanedText.replace(/^>\s?/gm, '');

  // Horizontal rules
  cleanedText = cleanedText.replace(/^(---|\*\*\*|___)\s*$/gm, '');

  // List items (handles '*', '+', '-', and numbered lists)
  cleanedText = cleanedText.replace(/^[\s]*([*+-]|\d+\.)\s+/gm, '');

  // Links & Images: ![alt](url) or [text](url) -> alt or text
  cleanedText = cleanedText.replace(/!?\[([^\]]*)\]\([^)]+\)/g, '$1');
  
  // Inline code
  cleanedText = cleanedText.replace(/`([^`]+)`/g, '$1');

  // Code blocks (remove the entire block including fences)
  cleanedText = cleanedText.replace(/```[\s\S]*?```/g, '');
  
  // 4. Final cleanup for excessive newlines and trim whitespace
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
  cleanedText = cleanedText.trim();

  return cleanedText;
};


const ExportButton: React.FC<ExportButtonProps> = ({ 
  content, 
  filename, 
  buttonText = "Xuất DOCX",
  className = "px-3 py-2 rounded-lg bg-slate-700/70 hover:bg-slate-600/80 text-slate-300 hover:text-sky-300 transition-all duration-200 flex items-center text-xs sm:text-sm shadow-md",
  disabled = false,
  title
}) => {
  const handleExport = async () => {
    if (!content) {
      alert("Không có nội dung để xuất tệp.");
      return;
    }

    try {
      const cleanedContent = cleanTextForExport(content);
      
      const paragraphs = cleanedContent.split('\n').map(line => 
        new Paragraph({
          children: [new TextRun(line)],
          spacing: { after: 120 } 
        })
      );

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
        styles: { 
          paragraphStyles: [
            {
              id: 'Normal',
              name: 'Normal',
              basedOn: 'Normal',
              next: 'Normal',
              quickFormat: true,
              run: {
                font: 'Times New Roman', // Common font for official docs
                size: 26, // 13pt
              },
            },
          ],
        }
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${filename}.docx`);
    } catch (error) {
      console.error("Lỗi khi xuất DOCX:", error);
      alert("Đã xảy ra lỗi khi tạo tệp DOCX. Vui lòng thử lại.");
    }
  };

  const isDisabled = disabled || !content;

  return (
    <button
      onClick={handleExport}
      title={title || buttonText}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'group focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800'}`}
      disabled={isDisabled}
    >
      <DocumentArrowDownIcon className="h-5 w-5 group-hover:scale-110 transition-transform" /> 
      <span className="sr-only sm:not-sr-only sm:ml-2 font-medium">{buttonText}</span>
    </button>
  );
};

export default ExportButton;