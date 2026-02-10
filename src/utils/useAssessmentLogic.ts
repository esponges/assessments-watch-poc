import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  Question, 
  Answer, 
  AssessmentSession, 
  AssessmentConfig, 
  AssessmentResult, 
  AssessmentProgress 
} from '../types/assessment';
import { getRandomQuestions, DEFAULT_ASSESSMENT_CONFIG } from '../data/questionBank';

interface UseAssessmentLogicOptions {
  config?: Partial<AssessmentConfig>;
  onSessionStart?: (session: AssessmentSession) => void;
  onQuestionAnswer?: (answer: Answer, progress: AssessmentProgress) => void;
  onSessionComplete?: (result: AssessmentResult) => void;
  onTimeWarning?: (timeRemaining: number) => void;
  onTimeUp?: () => void;
  questionCount?: number;
}

interface UseAssessmentLogicReturn {
  session: AssessmentSession | null;
  currentQuestion: Question | null;
  progress: AssessmentProgress | null;
  config: AssessmentConfig;
  isActive: boolean;
  isPaused: boolean;
  timeRemaining: number;
  selectedAnswer: number | undefined;
  canSubmitAnswer: boolean;
  startAssessment: (questionCount?: number) => void;
  pauseAssessment: () => void;
  resumeAssessment: () => void;
  selectAnswer: (answerIndex: number) => void;
  submitAnswer: () => void;
  completeAssessment: () => AssessmentResult | null;
  resetAssessment: () => void;
  getResult: () => AssessmentResult | null;
}

export const useAssessmentLogic = (options: UseAssessmentLogicOptions = {}): UseAssessmentLogicReturn => {
  const {
    config: configOverrides = {},
    onSessionStart,
    onQuestionAnswer,
    onSessionComplete,
    onTimeWarning,
    onTimeUp,
    questionCount = 10
  } = options;

  const config: AssessmentConfig = { ...DEFAULT_ASSESSMENT_CONFIG, ...configOverrides };
  
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | undefined>(undefined);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const hasWarningBeenShown = useRef<boolean>(false);

  // Generate session ID
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Calculate progress
  const calculateProgress = useCallback((currentSession: AssessmentSession): AssessmentProgress => {
    const totalTime = currentSession.totalTimeLimit;
    const timeSpent = totalTime - timeRemaining;
    const answeredQuestions = currentSession.answers.length;
    const percentComplete = (currentSession.currentQuestionIndex / currentSession.questions.length) * 100;

    return {
      currentQuestion: currentSession.currentQuestionIndex + 1,
      totalQuestions: currentSession.questions.length,
      answeredQuestions,
      timeSpent,
      timeRemaining,
      percentComplete
    };
  }, [timeRemaining]);

  // Timer management
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prevTime) => {
        const newTime = Math.max(0, prevTime - 1);
        
        // Check for time warning
        if (!hasWarningBeenShown.current && newTime <= config.warningTimeRemaining && newTime > 0) {
          hasWarningBeenShown.current = true;
          onTimeWarning?.(newTime);
        }
        
        // Check if time is up
        if (newTime === 0) {
          onTimeUp?.();
        }
        
        return newTime;
      });
    }, 1000);
  }, [config.warningTimeRemaining, onTimeWarning, onTimeUp]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start assessment
  const startAssessment = useCallback((count: number = questionCount) => {
    const questions = getRandomQuestions(count);
    const now = Date.now();
    
    const newSession: AssessmentSession = {
      id: generateSessionId(),
      startTime: now,
      questions: config.randomizeQuestions ? questions : questions,
      answers: [],
      currentQuestionIndex: 0,
      status: 'in_progress',
      totalTimeLimit: config.totalTimeLimit,
      timeRemaining: config.totalTimeLimit
    };

    setSession(newSession);
    setTimeRemaining(config.totalTimeLimit);
    setSelectedAnswer(undefined);
    setIsPaused(false);
    startTimeRef.current = now;
    questionStartTimeRef.current = now;
    hasWarningBeenShown.current = false;

    startTimer();
    onSessionStart?.(newSession);
  }, [questionCount, config, startTimer, onSessionStart]);

  // Pause/resume assessment
  const pauseAssessment = useCallback(() => {
    setIsPaused(true);
    stopTimer();
  }, [stopTimer]);

  const resumeAssessment = useCallback(() => {
    setIsPaused(false);
    startTimer();
  }, [startTimer]);

  // Answer selection
  const selectAnswer = useCallback((answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  }, []);

  // Submit answer
  const submitAnswer = useCallback(() => {
    if (!session || selectedAnswer === undefined) {
      return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const now = Date.now();
    const timeSpent = now - questionStartTimeRef.current;

    const answer: Answer = {
      questionId: currentQuestion.id,
      selectedAnswer,
      timeSpent,
      timestamp: now
    };

    const updatedSession: AssessmentSession = {
      ...session,
      answers: [...session.answers, answer],
      currentQuestionIndex: session.currentQuestionIndex + 1
    };

    // Check if assessment is complete
    if (updatedSession.currentQuestionIndex >= updatedSession.questions.length) {
      updatedSession.status = 'completed';
      updatedSession.endTime = now;
      updatedSession.duration = now - session.startTime;
      stopTimer();
    } else {
      questionStartTimeRef.current = now;
    }

    setSession(updatedSession);
    setSelectedAnswer(undefined);

    const progress = calculateProgress(updatedSession);
    onQuestionAnswer?.(answer, progress);

    // Complete assessment if all questions answered
    if (updatedSession.status === 'completed') {
      const result = calculateResult(updatedSession);
      onSessionComplete?.(result);
    }
  }, [session, selectedAnswer, stopTimer, calculateProgress, onQuestionAnswer, onSessionComplete]);

  // Calculate result
  const calculateResult = useCallback((completedSession: AssessmentSession): AssessmentResult => {
    const correctAnswers = completedSession.answers.reduce((count, answer) => {
      const question = completedSession.questions.find(q => q.id === answer.questionId);
      return question && question.correctAnswer === answer.selectedAnswer ? count + 1 : count;
    }, 0);

    const completionRate = (completedSession.answers.length / completedSession.questions.length) * 100;
    const timeSpent = completedSession.duration || (Date.now() - completedSession.startTime);

    return {
      sessionId: completedSession.id,
      score: correctAnswers,
      totalQuestions: completedSession.questions.length,
      correctAnswers,
      timeSpent: Math.floor(timeSpent / 1000),
      completionRate
    };
  }, []);

  // Get current result
  const getResult = useCallback((): AssessmentResult | null => {
    if (!session) return null;
    return calculateResult(session);
  }, [session, calculateResult]);

  // Complete assessment manually
  const completeAssessment = useCallback((): AssessmentResult | null => {
    if (!session) return null;

    const now = Date.now();
    const completedSession: AssessmentSession = {
      ...session,
      status: 'completed',
      endTime: now,
      duration: now - session.startTime
    };

    setSession(completedSession);
    stopTimer();

    const result = calculateResult(completedSession);
    onSessionComplete?.(result);
    return result;
  }, [session, stopTimer, calculateResult, onSessionComplete]);

  // Reset assessment
  const resetAssessment = useCallback(() => {
    stopTimer();
    setSession(null);
    setSelectedAnswer(undefined);
    setIsPaused(false);
    setTimeRemaining(0);
    hasWarningBeenShown.current = false;
  }, [stopTimer]);

  // Handle time up
  useEffect(() => {
    if (session && timeRemaining === 0 && session.status === 'in_progress') {
      completeAssessment();
    }
  }, [session, timeRemaining, completeAssessment]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  // Current question and progress
  const currentQuestion = session ? session.questions[session.currentQuestionIndex] || null : null;
  const progress = session ? calculateProgress(session) : null;
  const isActive = session?.status === 'in_progress';
  const canSubmitAnswer = selectedAnswer !== undefined;

  return {
    session,
    currentQuestion,
    progress,
    config,
    isActive,
    isPaused,
    timeRemaining,
    selectedAnswer,
    canSubmitAnswer,
    startAssessment,
    pauseAssessment,
    resumeAssessment,
    selectAnswer,
    submitAnswer,
    completeAssessment,
    resetAssessment,
    getResult
  };
};