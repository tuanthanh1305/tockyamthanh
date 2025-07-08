
import React from 'react';
import { GroundingChunk } from '../../types';
import { LinkIcon, MagnifyingGlassCircleIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface UrlListDisplayProps {
  extractedUrls?: string[];
  groundingSources?: GroundingChunk[];
}

const UrlListDisplay: React.FC<UrlListDisplayProps> = ({ extractedUrls, groundingSources }) => {
  const hasExtractedUrls = extractedUrls && extractedUrls.length > 0;
  const hasGroundingSources = groundingSources && groundingSources.length > 0;

  if (!hasExtractedUrls && !hasGroundingSources) {
    return null;
  }

  const renderUrlItem = (url: string, index: number, title?: string, keyPrefix: string = "url") => (
    <li key={`${keyPrefix}-${index}`} className="text-sm">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-300 hover:text-sky-300 hover:underline break-all transition-colors duration-200 flex items-center group py-1 rounded hover:bg-slate-700/50 px-1.5 -ml-1.5"
        title={`Mở liên kết: ${title || url}`}
      >
        <GlobeAltIcon className="h-4 w-4 mr-2 text-slate-400 group-hover:text-sky-400 transition-colors shrink-0"/>
        <span className="truncate">{title || url}</span>
      </a>
    </li>
  );

  return (
    <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4 p-4 bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-700/60 shadow-lg">
      {hasExtractedUrls && (
        <div>
          <h3 className="text-base font-semibold text-sky-300 mb-2 flex items-center">
            <LinkIcon className="h-5 w-5 mr-2.5 text-sky-400" />
            URL Trích Xuất Từ Văn Bản Gốc:
          </h3>
          <ul className="list-none pl-0 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1.5">
            {extractedUrls.map((url, index) => renderUrlItem(url, index, undefined, "extracted"))}
          </ul>
        </div>
      )}

      {hasExtractedUrls && hasGroundingSources && <div className="border-t border-slate-700 my-3"></div>}

      {hasGroundingSources && (
        <div>
          <h3 className="text-base font-semibold text-sky-300 mb-2 flex items-center">
            <MagnifyingGlassCircleIcon className="h-5 w-5 mr-2.5 text-sky-400" />
            Nguồn Tham Khảo (AI Tìm Kiếm trên Internet):
          </h3>
          <ul className="list-none pl-0 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1.5">
            {groundingSources.map((source, index) =>
              source.web?.uri ? renderUrlItem(source.web.uri, index, source.web.title, "grounding") : null
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UrlListDisplay;