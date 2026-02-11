import React from 'react';
import type { DashboardNavigationProps } from '../types/dashboard';
import './DashboardNavigation.css';

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  mode,
  onModeChange,
  onExportAll,
  onClearData,
  onRefresh,
  stats
}) => {
  const formatTimeRange = (start: number, end: number): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();
    
    const isToday = (date: Date) => {
      return date.toDateString() === now.toDateString();
    };
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };
    
    if (isToday(startDate) && isToday(endDate)) {
      return `Today ${formatTime(startDate)} - ${formatTime(endDate)}`;
    } else if (startDate.toDateString() === endDate.toDateString()) {
      return `${formatDate(startDate)} ${formatTime(startDate)} - ${formatTime(endDate)}`;
    } else {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
  };

  const getTimeRangePresets = () => [
    {
      label: 'Last Hour',
      value: { start: Date.now() - 60 * 60 * 1000, end: Date.now() }
    },
    {
      label: 'Last 6 Hours',
      value: { start: Date.now() - 6 * 60 * 60 * 1000, end: Date.now() }
    },
    {
      label: 'Last 24 Hours',
      value: { start: Date.now() - 24 * 60 * 60 * 1000, end: Date.now() }
    },
    {
      label: 'Last 7 Days',
      value: { start: Date.now() - 7 * 24 * 60 * 60 * 1000, end: Date.now() }
    },
    {
      label: 'Last 30 Days',
      value: { start: Date.now() - 30 * 24 * 60 * 60 * 1000, end: Date.now() }
    }
  ];

  return (
    <div className="dashboard-navigation">
      <div className="nav-header">
        <h1 className="dashboard-title">
          🏛️ Monitoring Dashboard
        </h1>
        <div className="nav-actions">
          <button
            onClick={onRefresh}
            className="action-btn refresh-btn"
            title="Refresh data"
          >
            🔄 Refresh
          </button>
          <button
            onClick={onExportAll}
            className="action-btn export-btn"
            title="Export all data"
          >
            📊 Export All
          </button>
          <button
            onClick={onClearData}
            className="action-btn clear-btn"
            title="Clear all data"
          >
            🗑️ Clear Data
          </button>
        </div>
      </div>

      <div className="nav-controls">
        <div className="view-toggle">
          <label className="toggle-label">View Mode:</label>
          <div className="toggle-buttons">
            <button
              onClick={() => onModeChange({ view: 'realtime' })}
              className={`toggle-btn ${mode.view === 'realtime' ? 'active' : ''}`}
            >
              🔴 Real-time
            </button>
            <button
              onClick={() => onModeChange({ view: 'review' })}
              className={`toggle-btn ${mode.view === 'review' ? 'active' : ''}`}
            >
              📋 Review
            </button>
          </div>
        </div>

        <div className="time-range-selector">
          <label className="range-label">Time Range:</label>
          <div className="range-controls">
            <select
              value=""
              onChange={(e) => {
                const preset = getTimeRangePresets().find(p => p.label === e.target.value);
                if (preset) {
                  onModeChange({ timeRange: preset.value });
                }
              }}
              className="range-select"
            >
              <option value="">Quick Select</option>
              {getTimeRangePresets().map(preset => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>
            <div className="range-display">
              {formatTimeRange(mode.timeRange.start, mode.timeRange.end)}
            </div>
          </div>
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label className="filter-label">Status:</label>
            <select
              value={mode.filters.status?.join(',') || ''}
              onChange={(e) => {
                const statuses = e.target.value ? e.target.value.split(',') : undefined;
                onModeChange({
                  filters: { ...mode.filters, status: statuses as any }
                });
              }}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={mode.filters.flagged === true}
                onChange={(e) => {
                  onModeChange({
                    filters: {
                      ...mode.filters,
                      flagged: e.target.checked ? true : undefined
                    }
                  });
                }}
              />
              <span className="checkbox-label">Flagged Only</span>
            </label>
          </div>

          <div className="filter-group">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={mode.filters.suspicious === true}
                onChange={(e) => {
                  onModeChange({
                    filters: {
                      ...mode.filters,
                      suspicious: e.target.checked ? true : undefined
                    }
                  });
                }}
              />
              <span className="checkbox-label">Suspicious Only</span>
            </label>
          </div>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalSessions}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>

        <div className="stat-card active">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activeSessions}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completedSessions}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="stat-card flagged">
          <div className="stat-icon">🚩</div>
          <div className="stat-content">
            <div className="stat-value">{stats.flaggedSessions}</div>
            <div className="stat-label">Flagged</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{Math.round(stats.averageScore)}%</div>
            <div className="stat-label">Avg Score</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{Math.round(stats.averageDuration / 60)}m</div>
            <div className="stat-label">Avg Duration</div>
          </div>
        </div>

        <div className="stat-card suspicious">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{Math.round(stats.suspiciousActivityRate * 100)}%</div>
            <div className="stat-label">Suspicious Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardNavigation;