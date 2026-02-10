import { useState, useEffect } from 'react';
import type { ScoringStats, ScoringSummary, Flag } from '../types/scoring';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  stats: ScoringStats | null;
  summary: ScoringSummary | null;
  currentScore: number;
  flags: Flag[];
  isVisible: boolean;
  compact?: boolean;
  showHistory?: boolean;
  showBreakdown?: boolean;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  stats,
  summary,
  currentScore,
  flags,
  isVisible,
  compact = false,
  showHistory = true,
  showBreakdown = true
}) => {
  const [animatingScore, setAnimatingScore] = useState<number | null>(null);

  // Animate score changes
  useEffect(() => {
    if (stats?.scoreHistory.length) {
      const lastChange = stats.scoreHistory[stats.scoreHistory.length - 1]?.change;
      if (lastChange && lastChange.pointsChanged > 0) {
        setAnimatingScore(lastChange.pointsChanged);
        
        const timer = setTimeout(() => {
          setAnimatingScore(null);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [stats?.scoreHistory.length]);

  if (!isVisible) {
    return null;
  }

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 20) return '#721c24'; // Critical
    if (score >= 15) return '#dc3545'; // High
    if (score >= 8) return '#fd7e14';  // Medium (flagged)
    if (score >= 5) return '#ffc107';  // Warning
    return '#28a745'; // Good
  };

  const getRiskLevelColor = (riskLevel: ScoringSummary['riskLevel']): string => {
    switch (riskLevel) {
      case 'critical': return '#721c24';
      case 'high': return '#dc3545';
      case 'medium': return '#fd7e14';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getFlagIcon = (level: Flag['level']): string => {
    switch (level) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '🔶';
      case 'low': return '🔸';
      default: return '❗';
    }
  };

  const activeFlagsCount = flags.filter(flag => flag.isActive).length;
  const highestActiveFlag = flags
    .filter(flag => flag.isActive)
    .sort((a, b) => b.priority - a.priority)[0];

  return (
    <div className={`score-display ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="score-header">
        <div className="score-title">
          <span className="score-icon">📊</span>
          <span className="score-text">Assessment Score</span>
        </div>
        
        {summary && (
          <div className="risk-level">
            <span 
              className="risk-badge"
              style={{ 
                backgroundColor: getRiskLevelColor(summary.riskLevel),
                color: 'white'
              }}
            >
              {summary.riskLevel.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Main Score */}
      <div className="score-main">
        <div className="current-score">
          <span 
            className="score-value"
            style={{ color: getScoreColor(currentScore) }}
          >
            {currentScore}
          </span>
          <span className="score-label">Points</span>
          
          {animatingScore && (
            <div className="score-animation">
              +{animatingScore}
            </div>
          )}
        </div>

        {stats && stats.maxScoreReached > currentScore && (
          <div className="max-score">
            <span className="max-label">Peak: {stats.maxScoreReached}</span>
          </div>
        )}
      </div>

      {/* Active Flags */}
      {activeFlagsCount > 0 && (
        <div className="active-flags">
          <div className="flags-header">
            <span className="flags-icon">🚩</span>
            <span className="flags-count">{activeFlagsCount} Active Flag{activeFlagsCount !== 1 ? 's' : ''}</span>
          </div>
          
          {highestActiveFlag && (
            <div className={`flag-item flag-${highestActiveFlag.level}`}>
              <span className="flag-icon">{getFlagIcon(highestActiveFlag.level)}</span>
              <div className="flag-content">
                <div className="flag-reason">{highestActiveFlag.reason}</div>
                <div className="flag-details">
                  Priority {highestActiveFlag.priority} • Score {highestActiveFlag.score}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score Breakdown */}
      {!compact && showBreakdown && stats && (
        <div className="score-breakdown">
          <div className="breakdown-header">Score Breakdown</div>
          <div className="breakdown-grid">
            <div className="breakdown-item">
              <div className="breakdown-value">
                {stats.eventContributions.multipleFaces.events}
              </div>
              <div className="breakdown-label">Multiple Faces</div>
              <div className="breakdown-points">
                +{stats.eventContributions.multipleFaces.totalPoints} pts
              </div>
            </div>
            
            <div className="breakdown-item">
              <div className="breakdown-value">
                {stats.eventContributions.lookingAway.events}
              </div>
              <div className="breakdown-label">Looking Away</div>
              <div className="breakdown-points">
                +{stats.eventContributions.lookingAway.totalPoints} pts
              </div>
            </div>
            
            <div className="breakdown-item">
              <div className="breakdown-value">
                {stats.eventContributions.other.events}
              </div>
              <div className="breakdown-label">Other Events</div>
              <div className="breakdown-points">
                +{stats.eventContributions.other.totalPoints} pts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score Statistics */}
      {!compact && stats && (
        <div className="score-stats">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{stats.totalPointsAwarded}</div>
              <div className="stat-label">Total Points</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{stats.scoreChangeCount}</div>
              <div className="stat-label">Score Events</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{stats.averageScore.toFixed(1)}</div>
              <div className="stat-label">Avg Score</div>
            </div>
            
            {stats.sessionDuration > 0 && (
              <div className="stat-item">
                <div className="stat-value">{formatDuration(stats.sessionDuration)}</div>
                <div className="stat-label">Duration</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Score History */}
      {!compact && showHistory && stats && stats.scoreHistory.length > 0 && (
        <div className="score-history">
          <div className="history-header">Recent Activity</div>
          <div className="history-list">
            {stats.scoreHistory.slice(-3).reverse().map((entry, index) => (
              <div key={entry.timestamp} className="history-item">
                <div className="history-time">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
                <div className="history-score">
                  Score: {entry.score}
                </div>
                {entry.change && (
                  <div className="history-change">
                    +{entry.change.pointsChanged} ({entry.change.reason})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Information */}
      {summary && summary.flagged && (
        <div className="score-summary">
          <div className="summary-header">
            <span className="summary-icon">⚡</span>
            <span className="summary-text">Assessment Flagged</span>
          </div>
          
          {summary.keyIssues.length > 0 && (
            <div className="key-issues">
              <div className="issues-label">Key Issues:</div>
              <ul className="issues-list">
                {summary.keyIssues.slice(0, 3).map((issue, index) => (
                  <li key={index} className="issue-item">{issue}</li>
                ))}
              </ul>
            </div>
          )}
          
          {summary.recommendations.length > 0 && (
            <div className="recommendations">
              <div className="recommendations-label">Recommendation:</div>
              <div className="recommendation-text">
                {summary.recommendations[0]}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay;