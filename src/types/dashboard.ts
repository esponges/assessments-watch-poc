import type { AssessmentResult, AssessmentSession } from './assessment';
import type { MonitoringEvent } from './eventCollection';
import type { ScoringStats, Flag } from './scoring';

export interface SessionSummary {
  id: string;
  studentId: string;
  assessmentId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'in_progress' | 'completed' | 'abandoned' | 'flagged';
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  flagged: boolean;
  flagPriority: 'low' | 'medium' | 'high' | 'critical' | null;
  totalScore: number;
  eventCount: number;
  suspicious: boolean;
}

export interface SessionDetail extends SessionSummary {
  questions: Array<{
    id: string;
    question: string;
    selectedAnswer?: number;
    correctAnswer?: number;
    timeSpent: number;
    correct: boolean;
  }>;
  events: MonitoringEvent[];
  scoringHistory: Array<{
    timestamp: number;
    score: number;
    change: number;
    reason: string;
  }>;
  flags: Flag[];
  metadata: {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    ipAddress?: string;
  };
}

export interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  flaggedSessions: number;
  averageScore: number;
  averageDuration: number;
  suspiciousActivityRate: number;
  mostCommonFlags: Array<{
    type: string;
    count: number;
  }>;
}

export interface EventTimelineData {
  timestamp: number;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  metadata?: any;
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface DashboardMode {
  view: 'realtime' | 'review';
  selectedSession?: string;
  timeRange: {
    start: number;
    end: number;
  };
  filters: {
    status?: SessionSummary['status'][];
    flagged?: boolean;
    suspicious?: boolean;
    scoreRange?: {
      min: number;
      max: number;
    };
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface RealTimeMonitoringProps {
  activeSessions: SessionSummary[];
  selectedSession?: SessionSummary;
  onSessionSelect: (session: SessionSummary) => void;
  onSessionRefresh: () => void;
  stats: DashboardStats;
}

export interface SessionListProps {
  sessions: SessionSummary[];
  selectedSession?: SessionSummary;
  onSessionSelect: (session: SessionSummary) => void;
  onSessionDelete: (sessionId: string) => void;
  onSessionExport: (sessionId: string) => void;
  filters: DashboardMode['filters'];
  onFilterChange: (filters: DashboardMode['filters']) => void;
  loading?: boolean;
}

export interface SessionDetailViewProps {
  session: SessionDetail | null;
  onClose: () => void;
  onExport: () => void;
  onFlag: (flag: Partial<Flag>) => void;
  onUnflag: () => void;
  loading?: boolean;
}

export interface EventTimelineProps {
  events: EventTimelineData[];
  selectedEvent?: EventTimelineData;
  onEventSelect: (event: EventTimelineData) => void;
  timeRange: {
    start: number;
    end: number;
  };
  height?: number;
}

export interface ScoreChartProps {
  data: ChartDataPoint[];
  title: string;
  type: 'line' | 'bar' | 'area';
  color?: string;
  height?: number;
  showThreshold?: {
    value: number;
    label: string;
    color: string;
  };
}

export interface DashboardNavigationProps {
  mode: DashboardMode;
  onModeChange: (mode: Partial<DashboardMode>) => void;
  onExportAll: () => void;
  onClearData: () => void;
  onRefresh: () => void;
  stats: DashboardStats;
}

export interface DetectionIndicatorProps {
  type: 'face_detection' | 'gaze_tracking' | 'multiple_person' | 'looking_away';
  status: 'active' | 'inactive' | 'error' | 'warning';
  confidence: number;
  lastDetection?: number;
  events: number;
  compact?: boolean;
}

export interface SessionComparisonProps {
  sessions: SessionSummary[];
  onSessionAdd: (session: SessionSummary) => void;
  onSessionRemove: (sessionId: string) => void;
  metrics: Array<{
    key: string;
    label: string;
    format: (value: any) => string;
  }>;
}

export interface DashboardExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeEvents: boolean;
  includeScoring: boolean;
  includeMetadata: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sessions?: string[];
}

export interface DashboardAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  dismissible: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}