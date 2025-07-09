


import React, { useEffect, useState } from 'react';
import { FeatureDetail, SimplifiedFeatureKey } from '../types';
import UnderstandDocumentFeature from './features/UnderstandDocumentFeature';
import GenericDraftFeature from './features/GenericDraftFeature';
import ExtractMultimediaFeature from './features/ExtractMultimediaFeature';
import NewsAIFeature from './features/NewsAIFeature';

interface FeatureRendererProps {
  feature: FeatureDetail;
}

const FeatureRenderer: React.FC<FeatureRendererProps> = ({ feature }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50); 
    return () => clearTimeout(timer);
  }, [feature]);

  // If the feature is an external link, this component shouldn't be rendered.
  // The logic in HomePage handles the redirect. But as a fallback, we can return null.
  if (feature.externalUrl) {
    return null;
  }

  return (
    <div 
      className={`glass-pane p-5 sm:p-6 md:p-8 rounded-xl shadow-2xl h-full flex flex-col flex-grow w-full
                  border-sky-500/30 hover:border-sky-400/50 transition-all duration-700 ease-out 
                  ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'}`}
    >
      <div className="mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-slate-600/70">
        <div className="flex items-center mb-2.5">
          <div className="p-2.5 bg-sky-500/10 rounded-lg mr-3 shadow-inner border border-sky-500/20">
            <feature.icon className="h-8 w-8 sm:h-10 sm:w-10 text-sky-300 filter_subtle_glow" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gradient-cyber tracking-tight">{feature.title}</h2>
        </div>
        <p className="text-sm sm:text-base text-slate-300 ml-0 sm:ml-[58px]">{feature.description}</p> {/* Adjust margin based on icon + padding + mr */}
      </div>
      
      {/* Ensure this div and its children correctly utilize width */}
      <div className="flex-grow overflow-y-auto custom-scrollbar -mr-2 pr-2 min-h-0 relative w-full">
        {/* The feature components themselves should ensure their content takes full width if needed */}
        {feature.key === SimplifiedFeatureKey.AnalyzeDocument && <UnderstandDocumentFeature />}
        {feature.key === SimplifiedFeatureKey.GenericDraft && <GenericDraftFeature />}
        {feature.key === SimplifiedFeatureKey.ExtractMultimedia && <ExtractMultimediaFeature />} 
        {feature.key === SimplifiedFeatureKey.NewsAI && <NewsAIFeature />}
      </div>
    </div>
  );
};

export default FeatureRenderer;