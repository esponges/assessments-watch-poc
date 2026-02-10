export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: number; // Index of correct answer (for demo purposes)
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit?: number; // Time limit in seconds
}

export interface Answer {
  questionId: string;
  selectedAnswer: number;
  timeSpent: number;
  timestamp: number;
}

export interface AssessmentSession {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  questions: Question[];
  answers: Answer[];
  currentQuestionIndex: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  totalTimeLimit: number;
  timeRemaining: number;
}

export interface AssessmentConfig {
  timePerQuestion: number; // Default time per question in seconds
  totalTimeLimit: number; // Total assessment time limit in seconds
  allowReview: boolean;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  showProgress: boolean;
  autoSubmit: boolean;
  warningTimeRemaining: number; // When to show time warning
}

export interface AssessmentResult {
  sessionId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completionRate: number;
  monitoringData?: {
    flagged: boolean;
    suspiciousActivity: boolean;
    totalScore: number;
    events: number;
  };
}

export interface AssessmentProgress {
  currentQuestion: number;
  totalQuestions: number;
  answeredQuestions: number;
  timeSpent: number;
  timeRemaining: number;
  percentComplete: number;
}

export interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer?: number;
  timeRemaining: number;
  onAnswerSelect: (answerIndex: number) => void;
  onSubmit: () => void;
  isLastQuestion: boolean;
  canSubmit: boolean;
}

export interface ProgressIndicatorProps {
  progress: AssessmentProgress;
  showTimeWarning: boolean;
}

export interface AssessmentTimerProps {
  timeRemaining: number;
  totalTime: number;
  isWarning: boolean;
  isPaused: boolean;
  onTimeUp: () => void;
}

export interface AssessmentInstructionsProps {
  onStart: () => void;
  onCancel: () => void;
  config: AssessmentConfig;
  isMonitoringReady: boolean;
}

export interface AssessmentResultsProps {
  result: AssessmentResult;
  onRestart: () => void;
  onExit: () => void;
  onDownloadReport: () => void;
}