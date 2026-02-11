import { useState, useEffect, useCallback } from 'react';
import type {
  DashboardMode,
  SessionSummary,
  SessionDetail,
  DashboardStats
} from '../types/dashboard';

// Mock data for demonstration
const generateMockSessions = (count: number = 50): SessionSummary[] => {
  const sessions: SessionSummary[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const startTime = now - Math.random() * 7 * 24 * 60 * 60 * 1000; // Last 7 days
    const duration = Math.random() * 3600 * 1000; // 0-60 minutes
    const endTime = startTime + duration;
    const totalScore = Math.floor(Math.random() * 20);
    const flagged = totalScore > 8 || Math.random() < 0.1;
    const suspicious = totalScore > 3 || Math.random() < 0.2;
    const totalQuestions = 10;
    const correctAnswers = Math.floor(Math.random() * totalQuestions);
    
    const statuses: SessionSummary['status'][] = ['completed', 'completed', 'completed', 'in_progress', 'abandoned'];
    const status = i < 3 ? 'in_progress' : statuses[Math.floor(Math.random() * statuses.length)];
    
    sessions.push({
      id: `session_${Date.now()}_${i.toString().padStart(3, '0')}`,
      studentId: `student_${Math.random().toString(36).substr(2, 8)}`,
      assessmentId: `assessment_${Math.random().toString(36).substr(2, 6)}`,
      startTime,
      endTime: status === 'completed' ? endTime : undefined,
      duration: status === 'completed' ? duration : undefined,
      status: flagged ? 'flagged' : status,
      score: Math.round((correctAnswers / totalQuestions) * 100),
      totalQuestions,
      correctAnswers,
      flagged,
      flagPriority: flagged ? ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any : null,
      totalScore,
      eventCount: Math.floor(Math.random() * 50) + totalScore,
      suspicious
    });
  }
  
  return sessions.sort((a, b) => b.startTime - a.startTime);
};

const generateMockStats = (sessions: SessionSummary[]): DashboardStats => {
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'in_progress').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const flaggedSessions = sessions.filter(s => s.flagged).length;
  
  const averageScore = sessions.reduce((sum, s) => sum + s.score, 0) / totalSessions || 0;
  const averageDuration = sessions
    .filter(s => s.duration)
    .reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions || 0;
  
  const suspiciousActivityRate = sessions.filter(s => s.suspicious).length / totalSessions || 0;
  
  // Mock most common flags
  const flagTypes = ['multiple_faces', 'looking_away', 'suspicious_movement', 'external_help'];
  const mostCommonFlags = flagTypes.map(type => ({
    type,
    count: Math.floor(Math.random() * flaggedSessions) + 1
  })).sort((a, b) => b.count - a.count);
  
  return {
    totalSessions,
    activeSessions,
    completedSessions,
    flaggedSessions,
    averageScore,
    averageDuration,
    suspiciousActivityRate,
    mostCommonFlags
  };
};

const generateMockSessionDetail = (session: SessionSummary): SessionDetail => {
  const questions = Array.from({ length: session.totalQuestions }, (_, i) => ({
    id: `q${i + 1}`,
    question: `Sample question ${i + 1} for assessment`,
    selectedAnswer: Math.random() < 0.8 ? Math.floor(Math.random() * 4) : undefined,
    correctAnswer: Math.floor(Math.random() * 4),
    timeSpent: Math.random() * 120,
    correct: Math.random() < 0.7
  }));

  const events = Array.from({ length: session.eventCount }, (_, i) => {
    const timestamp = session.startTime + (i / session.eventCount) * (session.duration || Date.now() - session.startTime);
    const eventTypes = ['multiple_faces_detected', 'looking_away_extended', 'face_count_change', 'gaze_direction_change'];
    
    return {
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      timestamp,
      confidence: 0.5 + Math.random() * 0.5,
      metadata: {}
    };
  });

  const scoringHistory = Array.from({ length: Math.floor(session.totalScore / 3) }, (_, i) => ({
    timestamp: session.startTime + (i + 1) * 300000, // Every 5 minutes
    score: (i + 1) * 3,
    change: 3,
    reason: 'Suspicious activity detected'
  }));

  const flags = session.flagged ? [{
    id: `flag_${session.id}`,
    level: session.flagPriority || 'medium',
    reason: 'Automated flag based on monitoring score',
    score: session.totalScore,
    timestamp: session.startTime + (session.duration ? session.duration * 0.8 : 600000),
    triggeringEvents: [events[0]?.type || 'multiple_faces_detected'],
    automaticFlag: true,
    reviewed: false,
    reviewerId: null,
    reviewTimestamp: null,
    reviewNotes: null
  }] : [];

  return {
    ...session,
    questions,
    events,
    scoringHistory,
    flags,
    metadata: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      screenResolution: '1920x1080',
      timezone: 'America/New_York',
      ipAddress: '192.168.1.100'
    }
  };
};

interface UseDashboardDataReturn {
  sessions: SessionSummary[];
  activeSessions: SessionSummary[];
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
  getSessionDetail: (sessionId: string) => Promise<SessionDetail>;
  exportSession: (sessionId: string) => Promise<void>;
  exportAllSessions: (filters?: DashboardMode['filters']) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  flagSession: (sessionId: string, flag: any) => Promise<void>;
  unflagSession: (sessionId: string) => Promise<void>;
}

export const useDashboardData = (mode: DashboardMode): UseDashboardDataReturn => {
  const [allSessions, setAllSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize with mock data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Load from localStorage or generate mock data
        const storedSessions = localStorage.getItem('dashboard_sessions');
        let sessions: SessionSummary[];
        
        if (storedSessions) {
          sessions = JSON.parse(storedSessions);
        } else {
          sessions = generateMockSessions(50);
          localStorage.setItem('dashboard_sessions', JSON.stringify(sessions));
        }
        
        setAllSessions(sessions);
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, []);
  
  // Filter sessions based on mode
  const filteredSessions = allSessions.filter(session => {
    const { timeRange, filters } = mode;
    
    // Time range filter
    if (session.startTime < timeRange.start || session.startTime > timeRange.end) {
      return false;
    }
    
    // Status filter
    if (filters.status && !filters.status.includes(session.status)) {
      return false;
    }
    
    // Flagged filter
    if (filters.flagged === true && !session.flagged) {
      return false;
    }
    
    // Suspicious filter
    if (filters.suspicious === true && !session.suspicious) {
      return false;
    }
    
    // Score range filter
    if (filters.scoreRange) {
      if (session.score < filters.scoreRange.min || session.score > filters.scoreRange.max) {
        return false;
      }
    }
    
    return true;
  });
  
  const activeSessions = allSessions.filter(session => session.status === 'in_progress');
  const stats = generateMockStats(allSessions);
  
  const refreshData = useCallback(() => {
    // Simulate real-time updates for active sessions
    setAllSessions(prevSessions => {
      const updated = [...prevSessions];
      
      // Update active sessions with new events and scores
      updated.forEach(session => {
        if (session.status === 'in_progress') {
          // Randomly add events or increase score
          if (Math.random() < 0.1) { // 10% chance per refresh
            session.eventCount += 1;
            if (Math.random() < 0.3) { // 30% chance of score increase
              session.totalScore += Math.floor(Math.random() * 3) + 1;
              if (session.totalScore > 8 && !session.flagged) {
                session.flagged = true;
                session.status = 'flagged';
                session.flagPriority = 'high';
              }
            }
          }
        }
      });
      
      return updated;
    });
  }, []);
  
  const getSessionDetail = useCallback(async (sessionId: string): Promise<SessionDetail> => {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return generateMockSessionDetail(session);
  }, [allSessions]);
  
  const exportSession = useCallback(async (sessionId: string): Promise<void> => {
    const sessionDetail = await getSessionDetail(sessionId);
    
    const exportData = {
      session: sessionDetail,
      exportTimestamp: new Date().toISOString(),
      exportedBy: 'dashboard_user'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session_${sessionId}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getSessionDetail]);
  
  const exportAllSessions = useCallback(async (filters?: DashboardMode['filters']): Promise<void> => {
    const sessionsToExport = filters ? filteredSessions : allSessions;
    
    const exportData = {
      sessions: sessionsToExport,
      stats: generateMockStats(sessionsToExport),
      exportTimestamp: new Date().toISOString(),
      exportedBy: 'dashboard_user',
      filters
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_sessions_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [allSessions, filteredSessions]);
  
  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    setAllSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      localStorage.setItem('dashboard_sessions', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  const flagSession = useCallback(async (sessionId: string, flag: any): Promise<void> => {
    setAllSessions(prev => {
      const updated = prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            flagged: true,
            status: 'flagged' as const,
            flagPriority: flag.level || 'medium'
          };
        }
        return session;
      });
      localStorage.setItem('dashboard_sessions', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  const unflagSession = useCallback(async (sessionId: string): Promise<void> => {
    setAllSessions(prev => {
      const updated = prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            flagged: false,
            status: session.endTime ? 'completed' as const : 'in_progress' as const,
            flagPriority: null
          };
        }
        return session;
      });
      localStorage.setItem('dashboard_sessions', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  return {
    sessions: filteredSessions,
    activeSessions,
    stats,
    loading,
    error,
    refreshData,
    getSessionDetail,
    exportSession,
    exportAllSessions,
    deleteSession,
    flagSession,
    unflagSession
  };
};