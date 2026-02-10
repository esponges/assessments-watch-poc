import { useRef, useCallback, useEffect, useState } from 'react';
import { ScoreManager } from './scoreManager';
import type { MonitoringEvent } from '../types/events';
import type {
  ScoringConfig,
  ScoreChange,
  Flag,
  ScoringStats,
  ScoringSummary,
  ScoreManagerState,
  ScoreCalculationResult,
  ScoreManagerOptions
} from '../types/scoring';

interface UseScoreManagerOptions extends ScoreManagerOptions {
  autoStart?: boolean;
}

interface UseScoreManagerReturn {
  processEvent: (event: MonitoringEvent) => ScoreCalculationResult | null;
  startSession: () => void;
  endSession: () => ScoringSummary;
  updateConfig: (config: Partial<ScoringConfig>) => void;
  reset: () => void;
  getCurrentScore: () => number;
  getStats: () => ScoringStats;
  getSummary: () => ScoringSummary;
  getFlags: () => Flag[];
  state: ScoreManagerState | null;
  stats: ScoringStats | null;
  summary: ScoringSummary | null;
  currentScore: number;
  flags: Flag[];
  isActive: boolean;
  isSessionActive: () => boolean;
  error: Error | null;
}

export const useScoreManager = (
  options: UseScoreManagerOptions = {}
): UseScoreManagerReturn => {
  const [state, setState] = useState<ScoreManagerState | null>(null);
  const [stats, setStats] = useState<ScoringStats | null>(null);
  const [summary, setSummary] = useState<ScoringSummary | null>(null);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const scoreManagerRef = useRef<ScoreManager | null>(null);
  const { autoStart = true, ...scoreManagerOptions } = options;

  // Handle score change events
  const handleScoreChange = useCallback((change: ScoreChange, newStats: ScoringStats) => {
    console.log('Score changed:', change);
    setCurrentScore(newStats.currentScore);
    setStats({ ...newStats });
    setState(scoreManagerRef.current?.getState() || null);
    
    if (options.onScoreChange) {
      options.onScoreChange(change, newStats);
    }
  }, [options]);

  // Handle flag raised events
  const handleFlagRaised = useCallback((flag: Flag, newStats: ScoringStats) => {
    console.log('Flag raised:', flag);
    setFlags([...newStats.flags]);
    setStats({ ...newStats });
    setState(scoreManagerRef.current?.getState() || null);
    setSummary(scoreManagerRef.current?.getSummary() || null);
    
    if (options.onFlagRaised) {
      options.onFlagRaised(flag, newStats);
    }
  }, [options]);

  // Handle errors
  const handleError = useCallback((err: Error, context?: string) => {
    console.error(`Score manager error${context ? ` (${context})` : ''}:`, err);
    setError(err);
    if (options.onError) {
      options.onError(err, context);
    }
  }, [options]);

  // Initialize score manager
  const initialize = useCallback(() => {
    if (scoreManagerRef.current) {
      return; // Already initialized
    }

    try {
      setError(null);

      const scoreManagerOptionsWithCallbacks: ScoreManagerOptions = {
        ...scoreManagerOptions,
        onScoreChange: handleScoreChange,
        onFlagRaised: handleFlagRaised,
        onError: handleError,
        autoStart: false // We'll start manually after setup
      };

      scoreManagerRef.current = new ScoreManager(scoreManagerOptionsWithCallbacks);
      
      // Initialize state
      setState(scoreManagerRef.current.getState());
      setStats(scoreManagerRef.current.getStats());
      setSummary(scoreManagerRef.current.getSummary());
      setCurrentScore(scoreManagerRef.current.getCurrentScore());
      setFlags(scoreManagerRef.current.getFlags());
      setIsActive(scoreManagerRef.current.isSessionActive());

      console.log('Score manager hook initialized');

      // Auto-start if requested
      if (autoStart) {
        scoreManagerRef.current.startSession();
        setIsActive(true);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'initialize');
      throw error;
    }
  }, [scoreManagerOptions, handleScoreChange, handleFlagRaised, handleError, autoStart]);

  // Process monitoring event
  const processEvent = useCallback((event: MonitoringEvent): ScoreCalculationResult | null => {
    if (!scoreManagerRef.current) {
      console.warn('Score manager not initialized');
      return null;
    }

    try {
      const result = scoreManagerRef.current.processEvent(event);
      
      // Update local state
      setState(scoreManagerRef.current.getState());
      setStats(scoreManagerRef.current.getStats());
      setSummary(scoreManagerRef.current.getSummary());
      setCurrentScore(scoreManagerRef.current.getCurrentScore());
      setFlags(scoreManagerRef.current.getFlags());
      
      return result;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'processEvent');
      return null;
    }
  }, [handleError]);

  // Start session
  const startSession = useCallback(() => {
    if (!scoreManagerRef.current) {
      console.warn('Score manager not initialized');
      return;
    }

    try {
      scoreManagerRef.current.startSession();
      setIsActive(true);
      setState(scoreManagerRef.current.getState());
      setStats(scoreManagerRef.current.getStats());
      setSummary(scoreManagerRef.current.getSummary());
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'startSession');
    }
  }, [handleError]);

  // End session
  const endSession = useCallback((): ScoringSummary => {
    if (!scoreManagerRef.current) {
      console.warn('Score manager not initialized');
      return {
        finalScore: 0,
        flagged: false,
        highestFlag: null,
        totalFlags: 0,
        flagsByLevel: { low: 0, medium: 0, high: 0, critical: 0 },
        riskLevel: 'low',
        recommendations: [],
        keyIssues: []
      };
    }

    try {
      const finalSummary = scoreManagerRef.current.endSession();
      setIsActive(false);
      setState(scoreManagerRef.current.getState());
      setStats(scoreManagerRef.current.getStats());
      setSummary(finalSummary);
      return finalSummary;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, 'endSession');
      return summary || {
        finalScore: 0,
        flagged: false,
        highestFlag: null,
        totalFlags: 0,
        flagsByLevel: { low: 0, medium: 0, high: 0, critical: 0 },
        riskLevel: 'low',
        recommendations: [],
        keyIssues: []
      };
    }
  }, [handleError, summary]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<ScoringConfig>) => {
    if (scoreManagerRef.current) {
      scoreManagerRef.current.updateConfig(newConfig);
      setState(scoreManagerRef.current.getState());
    }
  }, []);

  // Reset score manager
  const reset = useCallback(() => {
    if (scoreManagerRef.current) {
      scoreManagerRef.current.reset();
      setState(scoreManagerRef.current.getState());
      setStats(scoreManagerRef.current.getStats());
      setSummary(scoreManagerRef.current.getSummary());
      setCurrentScore(scoreManagerRef.current.getCurrentScore());
      setFlags(scoreManagerRef.current.getFlags());
    }
    setIsActive(false);
    setError(null);
  }, []);

  // Getter functions
  const getCurrentScore = useCallback((): number => {
    return scoreManagerRef.current?.getCurrentScore() || 0;
  }, []);

  const getStats = useCallback((): ScoringStats => {
    return scoreManagerRef.current?.getStats() || stats || {
      currentScore: 0,
      maxScoreReached: 0,
      totalPointsAwarded: 0,
      totalPointsLost: 0,
      scoreChangeCount: 0,
      averageScore: 0,
      sessionDuration: 0,
      flags: [],
      scoreHistory: [],
      eventContributions: {
        multipleFaces: { events: 0, totalPoints: 0, averagePoints: 0 },
        lookingAway: { events: 0, totalPoints: 0, averagePoints: 0 },
        other: { events: 0, totalPoints: 0, averagePoints: 0 }
      }
    };
  }, [stats]);

  const getSummary = useCallback((): ScoringSummary => {
    return scoreManagerRef.current?.getSummary() || summary || {
      finalScore: 0,
      flagged: false,
      highestFlag: null,
      totalFlags: 0,
      flagsByLevel: { low: 0, medium: 0, high: 0, critical: 0 },
      riskLevel: 'low',
      recommendations: [],
      keyIssues: []
    };
  }, [summary]);

  const getFlags = useCallback((): Flag[] => {
    return scoreManagerRef.current?.getFlags() || [];
  }, []);

  const isSessionActive = useCallback((): boolean => {
    return scoreManagerRef.current?.isSessionActive() || false;
  }, []);

  // Auto-initialize if requested
  useEffect(() => {
    try {
      initialize();
    } catch (error) {
      console.error('Auto-initialization failed:', error);
    }

    return () => {
      scoreManagerRef.current = null;
      setIsActive(false);
    };
  }, [initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scoreManagerRef.current && isActive) {
        try {
          scoreManagerRef.current.endSession();
        } catch (error) {
          console.error('Cleanup failed:', error);
        }
      }
      scoreManagerRef.current = null;
      setIsActive(false);
    };
  }, [isActive]);

  return {
    processEvent,
    startSession,
    endSession,
    updateConfig,
    reset,
    getCurrentScore,
    getStats,
    getSummary,
    getFlags,
    state,
    stats,
    summary,
    currentScore,
    flags,
    isActive,
    isSessionActive,
    error
  };
};