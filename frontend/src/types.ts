export type PlatformId = 'tiktok' | 'instagram' | 'youtube' | 'google-trends';

export interface ScoreBreakdown {
  velocityScore: number;
  engagementScore: number;
  freshnessScore: number;
  crossPlatformScore: number;
  commentScore: number;
  weights: { velocity: number; engagement: number; freshness: number; crossPlatform: number; comments: number };
  inputs: {
    viewsPerHour: number | null;
    engagementRate: number | null;
    engagementEstimated: boolean;
    hoursSincePublished: number | null;
    crossPlatformCount: number;
    comments: number | null;
  };
}

export interface TrendItem {
  id: number;
  url: string | null;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  platformId: PlatformId;
  creator?: { id: number; handle: string; displayName: string | null; followerCount: number | null } | null;
  niche?: { id: number; name: string } | null;
  audio?: { id: number; name: string } | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  followerCount: number | null;
  publishedAt: string | null;
  hoursSincePublished: number | null;
  format: string | null;
  country: string | null;
  language: string | null;
  notes: string | null;
  saved: boolean;
  monitoring: boolean;
  isSample: boolean;
  trendScore: number;
  trendLabel: string;
  engagementRate: number | null;
  engagementEstimated: boolean;
  viewsPerHour: number | null;
  crossPlatformCount: number;
  scoreBreakdown: string | null;
  hashtags: string[];
  createdAt: string;
  snapshots?: MetricSnapshot[];
}

export interface MetricSnapshot {
  id: number;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  trendScore: number | null;
  capturedAt: string;
}

export interface SavedIdea {
  id: number;
  title: string;
  hook: string | null;
  caption: string | null;
  hashtags: string | null;
  format: string | null;
  duration: string | null;
  visualStructure: string | null;
  callToAction: string | null;
  angle: string | null;
  rationale: string | null;
  category: string | null;
  notes: string | null;
  status: string;
  priority: string;
  intendedPlatform: string | null;
  plannedRecordingDate: string | null;
  recorded: boolean;
  edited: boolean;
  posted: boolean;
  publishedUrl: string | null;
  niche?: { id: number; name: string } | null;
  sourceTrend?: { id: number; title: string; url: string | null } | null;
  isSample: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedIdea {
  title: string;
  videoIdea: string;
  hook: string;
  caption: string;
  hashtags: string[];
  format: string;
  duration: string;
  visualStructure: string;
  callToAction: string;
  angle: string;
  rationale: string;
  category: string;
}

export interface DashboardStats {
  totalTrends: number;
  newToday: number;
  savedIdeas: number;
  monitored: number;
  highestScore: { score: number; item: TrendItem } | null;
  bestPlatform: PlatformId | null;
  platformComparison: { platformId: PlatformId; count: number; avgScore: number; avgEngagement: number | null; totalViews: number }[];
  topNiches: { name: string; count: number; avgScore: number }[];
  crossPlatformTopics: number;
  recentItems: TrendItem[];
  activity: { date: string; added: number; avgScore: number }[];
  hasSampleData: boolean;
}

export interface Niche {
  id: number;
  name: string;
  isDefault: boolean;
  trendCount: number;
  ideaCount: number;
}

export interface StructureAnalysis {
  hook: string;
  setup: string;
  payoff: string;
  patternInterrupt: string;
  editingStyle: string;
  captionStyle: string;
  visualChanges: string;
  audioUse: string;
  callToAction: string;
  approximateDuration: string;
  retentionFactors: string[];
  notes: string;
}

export const PLATFORM_NAMES: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  'google-trends': 'Google Trends',
};

export const COUNTRIES = ['Worldwide', 'Portugal', 'India', 'Nepal', 'United Kingdom', 'United States'];

export const IDEA_STATUSES = [
  { id: 'idea', name: 'Idea' },
  { id: 'researching', name: 'Researching' },
  { id: 'script-ready', name: 'Script ready' },
  { id: 'ready-to-record', name: 'Ready to record' },
  { id: 'recorded', name: 'Recorded' },
  { id: 'editing', name: 'Editing' },
  { id: 'scheduled', name: 'Scheduled' },
  { id: 'published', name: 'Published' },
  { id: 'archived', name: 'Archived' },
];
