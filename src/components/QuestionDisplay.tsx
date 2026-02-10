import React from 'react';
import type { QuestionDisplayProps } from '../types/assessment';
import './QuestionDisplay.css';

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  timeRemaining,
  onAnswerSelect,
  onSubmit,
  isLastQuestion,
  canSubmit
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimeWarning = timeRemaining <= 30; // Warning when 30 seconds left
  const isTimeCritical = timeRemaining <= 10; // Critical when 10 seconds left

  return (
    <div className="question-display">
      <div className="question-header">
        <div className="question-info">
          <span className="question-number">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="question-category">
            {question.category} • {question.difficulty}
          </span>
        </div>
        <div className={`time-display ${isTimeWarning ? 'warning' : ''} ${isTimeCritical ? 'critical' : ''}`}>
          <span className="time-icon">⏱️</span>
          <span className="time-text">{formatTime(timeRemaining)}</span>
        </div>
      </div>

      <div className="question-content">
        <h2 className="question-text">{question.question}</h2>
        
        <div className="answer-options">
          {question.options.map((option, index) => (
            <label
              key={index}
              className={`option-label ${selectedAnswer === index ? 'selected' : ''}`}
              onClick={() => onAnswerSelect(index)}
            >
              <input
                type="radio"
                name="answer"
                value={index}
                checked={selectedAnswer === index}
                onChange={() => onAnswerSelect(index)}
                className="option-radio"
              />
              <span className="option-indicator">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="option-text">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="question-actions">
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`submit-btn ${canSubmit ? 'enabled' : 'disabled'}`}
        >
          {isLastQuestion ? 'Complete Assessment' : 'Next Question'}
        </button>
        
        {selectedAnswer === undefined && (
          <p className="selection-hint">Please select an answer to continue</p>
        )}
      </div>

      {isTimeWarning && (
        <div className={`time-warning ${isTimeCritical ? 'critical' : ''}`}>
          {isTimeCritical 
            ? '⚠️ Time almost up! Please submit your answer.'
            : '⏰ Running low on time for this question.'
          }
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;