import React from 'react';
import { Part } from '@google/genai'; // For potential future use if aligning ChatMessage more closely

// MainCategoryKey remains useful for structural organization if needed,
// but SubFeatureKey will be simplified.
export enum MainCategoryKey {
  UnderstandingIncoming = 'UnderstandingIncoming',
  DraftingOutgoing = 'DraftingOutgoing',
}

export enum SimplifiedFeatureKey {
  AnalyzeDocument = 'AnalyzeDocument', // Replaces UnderstandDocument
  GenericDraft = 'GenericDraft',       // New generic drafting feature
  ExtractMultimedia = 'ExtractMultimedia', // New feature for multimedia
  NewsAI = 'NewsAI', // Replaces LiveAudioChat with NewsAI
  LiveTranscription = 'LiveTranscription', // New feature for speech-to-text
  AILawLookup = 'AILawLookup', // New feature for law lookup
}

export interface FeatureDetail {
  key: SimplifiedFeatureKey;
  title: string;
  description: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  externalUrl?: string; // Optional external URL for feature links
}

export interface GroundingChunkWeb {
  uri?: string;
  title?: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
}

export interface DocumentAnalysisResult {
  tasks: string;
  extractedUrlsFromText: string[];
  groundingWebSources?: GroundingChunk[];
  originalUserQuery: string;
  userQueryType: 'text' | 'file' | 'url';
  rawResponse?: string;
}

export interface NewsArticle {
  title: string;
  summary?: string;
  url: string;
  publication_date?: string;
}

export interface ChatMessageAttachment {
  type: 'file' | 'image' | 'url' | 'audio'; // Added 'audio' for clarity
  data: string; // Base64 for file/image (original file), URL string for url
  mimeType?: string; // e.g., 'image/png', 'application/pdf', original mime type of DOCX, 'audio/mp3'
  name?: string; // filename
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  attachment?: ChatMessageAttachment; // Optional attachment for the message
  analysisData?: DocumentAnalysisResult; // To store structured analysis data
  newsArticles?: NewsArticle[]; // To store news articles for the NewsAI feature
}

export interface ChatGenerationContent {
  text: string;
  attachment?: ChatMessageAttachment;
}

export interface UserProfile {
  id: string; // Will be the user's entered name
  name: string;
}
