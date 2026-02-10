import { useEffect, useRef } from 'react';
import type { 
  FaceCountStatus, 
  FaceCountStats, 
  FaceCountData 
} from '../types/faceCounter';
import './FaceCountDisplay.css';

interface FaceCountDisplayProps {
  status: FaceCountStatus | null;
  stats: FaceCountStats | null;
  history: FaceCountData[];
  isVisible: boolean;
  showHistory?: boolean;
  compact?: boolean;
}

const FaceCountDisplay: React.FC<FaceCountDisplayProps> = ({
  status,
  stats,
  history,
  isVisible,
  showHistory = true,
  compact = false
}) => {
  const historyCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw face count history
  useEffect(() => {
    if (!showHistory || !history.length || !historyCanvasRef.current) {
      return;
    }

    const canvas = historyCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(padding, padding, graphWidth, graphHeight);

    if (history.length === 0) return;

    // Find max count for scaling
    const maxCount = Math.max(3, Math.max(...history.map(d => d.smoothedCount)));
    const minTime = history[0].timestamp;
    const maxTime = history[history.length - 1].timestamp;
    const timeRange = Math.max(1000, maxTime - minTime); // At least 1 second range

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (for face counts)
    for (let i = 0; i <= maxCount; i++) {
      const y = padding + graphHeight - (i / maxCount) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.font = '10px monospace';
      ctx.fillText(i.toString(), 2, y + 3);
    }

    // Draw face count line
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    history.forEach((data, index) => {
      const x = padding + ((data.timestamp - minTime) / timeRange) * graphWidth;
      const y = padding + graphHeight - (data.smoothedCount / maxCount) * graphHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw confidence line
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    history.forEach((data, index) => {
      const x = padding + ((data.timestamp - minTime) / timeRange) * graphWidth;
      const y = padding + graphHeight - (data.confidence * graphHeight);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw stability indicators
    history.forEach(data => {
      const x = padding + ((data.timestamp - minTime) / timeRange) * graphWidth;
      const y = padding + graphHeight - (data.smoothedCount / maxCount) * graphHeight;
      
      ctx.fillStyle = data.isStable ? '#28a745' : '#ffc107';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Legend
    const legendY = height - 25;
    ctx.font = '10px monospace';
    
    ctx.fillStyle = '#007bff';
    ctx.fillText('Face Count', padding, legendY);
    
    ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
    ctx.fillText('Confidence', padding + 80, legendY);
    
    ctx.fillStyle = '#28a745';
    ctx.fillText('Stable', padding + 150, legendY);

  }, [history, showHistory]);

  if (!isVisible || !status) {
    return null;
  }

  const getStatusColor = (statusType: FaceCountStatus['status']): string => {
    switch (statusType) {
      case 'normal': return '#28a745'; // Green
      case 'multiple_faces': return '#dc3545'; // Red
      case 'no_faces': return '#6c757d'; // Gray
      case 'uncertain': return '#ffc107'; // Yellow
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (statusType: FaceCountStatus['status']): string => {
    switch (statusType) {
      case 'normal': return '👤';
      case 'multiple_faces': return '👥';
      case 'no_faces': return '❌';
      case 'uncertain': return '❓';
      default: return '❓';
    }
  };

  const getStatusText = (statusType: FaceCountStatus['status']): string => {
    switch (statusType) {
      case 'normal': return 'Single Person Detected';
      case 'multiple_faces': return 'Multiple People Detected';
      case 'no_faces': return 'No Person Detected';
      case 'uncertain': return 'Detection Uncertain';
      default: return 'Unknown Status';
    }
  };

  return (
    <div className={`face-count-display ${compact ? 'compact' : ''}`}>
      {/* Current Status */}
      <div 
        className="current-status" 
        style={{ borderColor: getStatusColor(status.status) }}
      >
        <div className="status-header">
          <span className="status-icon">{getStatusIcon(status.status)}</span>
          <span className="status-count" style={{ color: getStatusColor(status.status) }}>
            {status.smoothedCount}
          </span>
          <span className={`stability-indicator ${status.isStable ? 'stable' : 'unstable'}`}>
            {status.isStable ? '✓' : '~'}
          </span>
        </div>
        
        {!compact && (
          <>
            <div className="status-text">
              {getStatusText(status.status)}
            </div>
            
            <div className="status-details">
              <div className="detail-item">
                <span className="detail-label">Confidence:</span>
                <span className="detail-value">{(status.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Raw Count:</span>
                <span className="detail-value">{status.currentCount}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Statistics */}
      {!compact && stats && (
        <div className="face-count-stats">
          <h4>Session Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Frames:</span>
              <span className="stat-value">{stats.totalFrames}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Count:</span>
              <span className="stat-value">{stats.averageFaceCount.toFixed(1)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Count:</span>
              <span className="stat-value">{stats.maxFaceCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Multiple:</span>
              <span className="stat-value">{stats.multipleFaceDetections}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Single:</span>
              <span className="stat-value">{stats.singleFaceDetections}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">None:</span>
              <span className="stat-value">{stats.noFaceDetections}</span>
            </div>
          </div>
        </div>
      )}

      {/* History Graph */}
      {!compact && showHistory && history.length > 1 && (
        <div className="face-count-history">
          <h4>Face Count History</h4>
          <canvas
            ref={historyCanvasRef}
            width={300}
            height={120}
            className="history-canvas"
          />
        </div>
      )}

      {/* Last Event */}
      {!compact && status.lastEvent && (
        <div className="last-event">
          <h4>Latest Event</h4>
          <div className="event-details">
            <div className="event-type">{status.lastEvent.eventType.replace('_', ' ')}</div>
            <div className="event-info">
              {status.lastEvent.previousCount} → {status.lastEvent.currentCount}
              {status.lastEvent.duration && (
                <span className="event-duration">
                  ({(status.lastEvent.duration / 1000).toFixed(1)}s)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceCountDisplay;