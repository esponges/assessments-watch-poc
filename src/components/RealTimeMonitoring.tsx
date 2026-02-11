import React, { useState, useEffect } from 'react';
import type { RealTimeMonitoringProps } from '../types/dashboard';
import DetectionIndicators from './DetectionIndicators';
import ScoreChart from './ScoreChart';
import EventTimeline from './EventTimeline';
import './RealTimeMonitoring.css';

const RealTimeMonitoring: React.FC<RealTimeMonitoringProps> = ({
  activeSessions,
  selectedSession,
  onSessionSelect,
  onSessionRefresh,
  stats
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  
  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      onSessionRefresh();
    }, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, onSessionRefresh]);
  
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  const getSessionStatus = (session: any) => {
    if (session.flagged) return 'flagged';
    if (session.suspicious) return 'suspicious';
    if (session.status === 'in_progress') return 'active';
    return 'normal';
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'flagged': return '#dc3545';
      case 'suspicious': return '#ffc107';
      case 'active': return '#28a745';
      default: return '#6c757d';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'flagged': return '🚩';
      case 'suspicious': return '⚠️';
      case 'active': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="real-time-monitoring">
      <div className="monitoring-header">
        <h2>🔴 Real-time Monitoring</h2>
        <div className="monitoring-controls">
          <div className="auto-refresh-control">
            <label className="refresh-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="refresh-interval-select"
              >
                <option value={1}>1s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            )}
          </div>
          <button
            onClick={onSessionRefresh}
            className="manual-refresh-btn"
            title="Manual refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {activeSessions.length === 0 ? (
        <div className="no-active-sessions">
          <div className="no-sessions-icon">🔍</div>
          <h3>No Active Sessions</h3>
          <p>No assessment sessions are currently in progress.</p>
          <button
            onClick={onSessionRefresh}
            className="refresh-btn"
          >
            Refresh to check for new sessions
          </button>
        </div>
      ) : (
        <div className="monitoring-content">
          <div className="active-sessions-list">
            <h3>Active Sessions ({activeSessions.length})</h3>
            <div className="sessions-grid">
              {activeSessions.map(session => {
                const status = getSessionStatus(session);
                const isSelected = selectedSession?.id === session.id;
                
                return (
                  <div
                    key={session.id}
                    className={`session-card ${status} ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSessionSelect(session)}
                  >
                    <div className="session-header">
                      <div className="session-status">
                        <span className="status-icon">
                          {getStatusIcon(status)}
                        </span>
                        <span className="status-text">
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                      <div className="session-time">
                        {formatDuration(Date.now() - session.startTime)}
                      </div>
                    </div>
                    
                    <div className="session-info">
                      <div className="session-id">
                        Session: {session.id.slice(-8)}
                      </div>
                      <div className="student-id">
                        Student: {session.studentId}
                      </div>
                    </div>
                    
                    <div className="session-metrics">
                      <div className="metric">
                        <span className="metric-label">Score:</span>
                        <span className="metric-value">{session.totalScore}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Events:</span>
                        <span className="metric-value">{session.eventCount}</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Progress:</span>
                        <span className="metric-value">
                          {session.correctAnswers}/{session.totalQuestions}
                        </span>
                      </div>
                    </div>
                    
                    {session.flagged && (
                      <div className="flag-indicator">
                        <span className="flag-icon">🚩</span>
                        <span className="flag-priority">
                          {session.flagPriority?.toUpperCase() || 'FLAGGED'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedSession && (
            <div className="session-details">
              <div className="details-header">
                <h3>Session Details</h3>
                <button
                  onClick={() => onSessionSelect(selectedSession)}
                  className="close-details-btn"
                  title="Close details"
                >
                  ✕
                </button>
              </div>
              
              <div className="details-content">
                <div className="session-overview">
                  <div className="overview-item">
                    <span className="overview-label">Session ID:</span>
                    <span className="overview-value">{selectedSession.id}</span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Student ID:</span>
                    <span className="overview-value">{selectedSession.studentId}</span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Assessment ID:</span>
                    <span className="overview-value">{selectedSession.assessmentId}</span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Duration:</span>
                    <span className="overview-value">
                      {formatDuration(Date.now() - selectedSession.startTime)}
                    </span>
                  </div>
                  <div className="overview-item">
                    <span className="overview-label">Current Score:</span>
                    <span className="overview-value">{selectedSession.totalScore}</span>
                  </div>
                </div>
                
                <DetectionIndicators sessionId={selectedSession.id} />
                
                <div className="live-charts">
                  <ScoreChart 
                    data={[]} // Would be populated with real data
                    title="Score Progression"
                    type="line"
                    height={200}
                    showThreshold={{
                      value: 8,
                      label: 'Flag Threshold',
                      color: '#dc3545'
                    }}
                  />
                </div>
                
                <EventTimeline 
                  events={[]} // Would be populated with real data
                  timeRange={{
                    start: selectedSession.startTime,
                    end: Date.now()
                  }}
                  height={300}
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="monitoring-summary">
        <h3>📊 System Overview</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon">🎯</div>
            <div className="summary-content">
              <div className="summary-value">
                {stats.activeSessions}/{stats.totalSessions}
              </div>
              <div className="summary-label">Active/Total Sessions</div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon">⚠️</div>
            <div className="summary-content">
              <div className="summary-value">
                {Math.round(stats.suspiciousActivityRate * 100)}%
              </div>
              <div className="summary-label">Suspicious Activity Rate</div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon">🚩</div>
            <div className="summary-content">
              <div className="summary-value">
                {stats.flaggedSessions}
              </div>
              <div className="summary-label">Flagged Sessions</div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon">📈</div>
            <div className="summary-content">
              <div className="summary-value">
                {Math.round(stats.averageScore)}%
              </div>
              <div className="summary-label">Average Score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMonitoring;