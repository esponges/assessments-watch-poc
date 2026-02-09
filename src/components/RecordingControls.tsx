import type { UseVideoRecorderReturn } from '../types/recording';
import './RecordingControls.css';

interface RecordingControlsProps {
  recorder: UseVideoRecorderReturn;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({ recorder }) => {
  const {
    recordingState,
    recordingDuration,
    recordingResult,
    error,
    startRecording,
    stopRecording,
    isRecording,
    canRecord
  } = recorder;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!canRecord) {
    return (
      <div className="recording-controls">
        <div className="recording-status error">
          <div className="status-icon">⚠</div>
          <div className="status-text">
            <strong>Recording Not Available</strong>
            <p>Video recording is not supported in this browser or with the current stream.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recording-controls">
      <div className="recording-header">
        <h3>Session Recording</h3>
        <div className={`recording-status ${recordingState}`}>
          <div className="status-icon">
            {recordingState === 'idle' && '⏹️'}
            {recordingState === 'recording' && <div className="recording-dot"></div>}
            {recordingState === 'stopped' && '✓'}
            {recordingState === 'error' && '⚠'}
          </div>
          <div className="status-text">
            {recordingState === 'idle' && 'Ready to record'}
            {recordingState === 'recording' && 'Recording in progress...'}
            {recordingState === 'stopped' && 'Recording completed'}
            {recordingState === 'error' && 'Recording error'}
          </div>
        </div>
      </div>

      <div className="recording-info">
        {isRecording && (
          <div className="duration-display">
            <span className="duration-label">Duration:</span>
            <span className="duration-time">{formatDuration(recordingDuration)}</span>
          </div>
        )}

        {recordingResult && recordingState === 'stopped' && (
          <div className="recording-summary">
            <div className="summary-item">
              <span className="label">Duration:</span>
              <span className="value">{formatDuration(recordingResult.duration)}</span>
            </div>
            <div className="summary-item">
              <span className="label">File Size:</span>
              <span className="value">{formatFileSize(recordingResult.size)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Format:</span>
              <span className="value">{recordingResult.mimeType || 'Unknown'}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error.message}
          </div>
        )}
      </div>

      <div className="recording-actions">
        {recordingState === 'idle' && (
          <button 
            onClick={startRecording}
            className="record-btn start"
            disabled={!canRecord}
          >
            <span className="btn-icon">🔴</span>
            Start Recording
          </button>
        )}

        {recordingState === 'recording' && (
          <button 
            onClick={stopRecording}
            className="record-btn stop"
          >
            <span className="btn-icon">⏹️</span>
            Stop Recording
          </button>
        )}

        {recordingState === 'stopped' && (
          <button 
            onClick={startRecording}
            className="record-btn restart"
          >
            <span className="btn-icon">🔄</span>
            Record Again
          </button>
        )}

        {recordingState === 'error' && (
          <button 
            onClick={startRecording}
            className="record-btn retry"
          >
            <span className="btn-icon">🔄</span>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default RecordingControls;