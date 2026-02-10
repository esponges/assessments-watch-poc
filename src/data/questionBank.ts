import type { Question } from '../types/assessment';

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    question: 'What is the primary purpose of artificial intelligence in education?',
    options: [
      'To replace human teachers entirely',
      'To enhance learning experiences and provide personalized instruction',
      'To make education more expensive',
      'To eliminate the need for student assessment'
    ],
    correctAnswer: 1,
    category: 'AI in Education',
    difficulty: 'easy',
    timeLimit: 60
  },
  {
    id: 'q2',
    question: 'Which of the following is a key characteristic of machine learning?',
    options: [
      'It requires explicit programming for every decision',
      'It can improve performance through experience without being explicitly programmed',
      'It only works with small datasets',
      'It cannot handle complex problems'
    ],
    correctAnswer: 1,
    category: 'Machine Learning',
    difficulty: 'medium',
    timeLimit: 75
  },
  {
    id: 'q3',
    question: 'What is the main advantage of using neural networks for pattern recognition?',
    options: [
      'They are simple to understand and implement',
      'They require no training data',
      'They can automatically learn complex patterns from data',
      'They work only with structured data'
    ],
    correctAnswer: 2,
    category: 'Neural Networks',
    difficulty: 'medium',
    timeLimit: 90
  },
  {
    id: 'q4',
    question: 'In the context of data privacy, what does GDPR stand for?',
    options: [
      'General Data Processing Regulation',
      'Global Data Protection Rules',
      'General Data Protection Regulation',
      'Generic Data Privacy Requirements'
    ],
    correctAnswer: 2,
    category: 'Data Privacy',
    difficulty: 'easy',
    timeLimit: 45
  },
  {
    id: 'q5',
    question: 'Which programming paradigm is most commonly associated with functional programming?',
    options: [
      'Imperative programming with mutable state',
      'Object-oriented programming with inheritance',
      'Immutability and pure functions without side effects',
      'Procedural programming with global variables'
    ],
    correctAnswer: 2,
    category: 'Programming',
    difficulty: 'medium',
    timeLimit: 60
  },
  {
    id: 'q6',
    question: 'What is the primary benefit of using version control systems like Git?',
    options: [
      'To make code run faster',
      'To track changes and collaborate on code development',
      'To automatically fix bugs in code',
      'To reduce file sizes'
    ],
    correctAnswer: 1,
    category: 'Development Tools',
    difficulty: 'easy',
    timeLimit: 50
  },
  {
    id: 'q7',
    question: 'In web development, what does REST API stand for?',
    options: [
      'Representational State Transfer Application Programming Interface',
      'Remote System Transfer Application Programming Interface',
      'Real-time State Transfer Application Programming Interface',
      'Relational System Transfer Application Programming Interface'
    ],
    correctAnswer: 0,
    category: 'Web Development',
    difficulty: 'medium',
    timeLimit: 70
  },
  {
    id: 'q8',
    question: 'Which of the following is a fundamental principle of cybersecurity?',
    options: [
      'Making all data publicly accessible',
      'Using the same password for all accounts',
      'Implementing defense in depth with multiple security layers',
      'Disabling all security updates'
    ],
    correctAnswer: 2,
    category: 'Cybersecurity',
    difficulty: 'easy',
    timeLimit: 55
  },
  {
    id: 'q9',
    question: 'What is the main purpose of unit testing in software development?',
    options: [
      'To test the entire application at once',
      'To test individual components or functions in isolation',
      'To test user interface design',
      'To test network connectivity'
    ],
    correctAnswer: 1,
    category: 'Software Testing',
    difficulty: 'medium',
    timeLimit: 65
  },
  {
    id: 'q10',
    question: 'In database design, what does normalization help to achieve?',
    options: [
      'Increase data redundancy',
      'Reduce data integrity and consistency',
      'Minimize data redundancy and dependency',
      'Make queries slower'
    ],
    correctAnswer: 2,
    category: 'Database Design',
    difficulty: 'medium',
    timeLimit: 80
  },
  {
    id: 'q11',
    question: 'What is the primary advantage of cloud computing?',
    options: [
      'It requires more physical hardware',
      'It provides on-demand access to computing resources',
      'It is always more expensive than traditional computing',
      'It works only with specific operating systems'
    ],
    correctAnswer: 1,
    category: 'Cloud Computing',
    difficulty: 'easy',
    timeLimit: 60
  },
  {
    id: 'q12',
    question: 'Which design pattern is commonly used to ensure a class has only one instance?',
    options: [
      'Factory Pattern',
      'Observer Pattern',
      'Singleton Pattern',
      'Strategy Pattern'
    ],
    correctAnswer: 2,
    category: 'Design Patterns',
    difficulty: 'medium',
    timeLimit: 70
  },
  {
    id: 'q13',
    question: 'What is the primary purpose of responsive web design?',
    options: [
      'To make websites load faster',
      'To ensure websites work well on different screen sizes and devices',
      'To reduce development costs',
      'To improve search engine rankings only'
    ],
    correctAnswer: 1,
    category: 'Web Design',
    difficulty: 'easy',
    timeLimit: 50
  },
  {
    id: 'q14',
    question: 'In agile development, what is the main purpose of a sprint?',
    options: [
      'To complete the entire project at once',
      'To work in short, time-boxed iterations with specific goals',
      'To eliminate the need for testing',
      'To avoid team communication'
    ],
    correctAnswer: 1,
    category: 'Agile Development',
    difficulty: 'medium',
    timeLimit: 65
  },
  {
    id: 'q15',
    question: 'What is the main benefit of using containerization technologies like Docker?',
    options: [
      'To make applications run slower',
      'To ensure consistent deployment environments across different systems',
      'To increase security vulnerabilities',
      'To make applications larger in size'
    ],
    correctAnswer: 1,
    category: 'DevOps',
    difficulty: 'medium',
    timeLimit: 75
  }
];

export const DEFAULT_ASSESSMENT_CONFIG = {
  timePerQuestion: 60, // 60 seconds per question
  totalTimeLimit: 1200, // 20 minutes total
  allowReview: false,
  randomizeQuestions: true,
  randomizeAnswers: false,
  showProgress: true,
  autoSubmit: true,
  warningTimeRemaining: 300 // 5 minutes warning
};

export function getRandomQuestions(count: number = 10): Question[] {
  const shuffled = [...SAMPLE_QUESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, SAMPLE_QUESTIONS.length));
}

export function getQuestionsByCategory(category: string): Question[] {
  return SAMPLE_QUESTIONS.filter(q => q.category === category);
}

export function getQuestionsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): Question[] {
  return SAMPLE_QUESTIONS.filter(q => q.difficulty === difficulty);
}