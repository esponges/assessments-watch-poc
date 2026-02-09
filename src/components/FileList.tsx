import { useState } from 'react';
import type { RecordedFile } from '../types/files';
import { formatFileSize, formatDuration } from '../utils/fileUtils';
import './FileList.css';

interface FileListProps {
  files: RecordedFile[];
  onDownload: (fileId: string, customFilename?: string) => void;
  onRemove: (fileId: string) => void;
  onClearAll: () => void;
  storageStats: {
    fileCount: number;
    formattedTotalSize: string;
    formattedMaxSize: string;
    usagePercentage: number;
  };
}

const FileList: React.FC<FileListProps> = ({
  files,
  onDownload,
  onRemove,
  onClearAll,
  storageStats
}) => {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const toggleFileDetails = (fileId: string) => {
    setExpandedFile(prev => prev === fileId ? null : fileId);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  if (files.length === 0) {
    return (
      <div className="file-list empty">
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No recordings yet</h3>
          <p>Start recording to see your assessment sessions here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-list">
      <div className="file-list-header">
        <h3>Recorded Sessions</h3>
        <div className="storage-info">
          <div className="storage-usage">
            <span className="usage-text">
              {storageStats.formattedTotalSize} / {storageStats.formattedMaxSize}
            </span>
            <div className="usage-bar">
              <div 
                className="usage-fill"
                style={{ width: `${Math.min(storageStats.usagePercentage, 100)}%` }}
              />
            </div>
          </div>
          <button 
            onClick={onClearAll}
            className="clear-all-btn"
            disabled={files.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="file-items">
        {files.map((file) => (
          <div key={file.id} className="file-item">
            <div className="file-summary" onClick={() => toggleFileDetails(file.id)}>
              <div className="file-icon">🎥</div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-meta">
                  {formatDate(file.createdAt)} • {formatFileSize(file.size)} • {formatDuration(file.duration)}
                </div>
              </div>
              <div className="file-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file.id);
                  }}
                  className="download-btn"
                  title="Download file"
                >
                  ⬇️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(file.id);
                  }}
                  className="remove-btn"
                  title="Remove file"
                >
                  🗑️
                </button>
                <button
                  className="expand-btn"
                  title={expandedFile === file.id ? 'Hide details' : 'Show details'}
                >
                  {expandedFile === file.id ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {expandedFile === file.id && (
              <div className="file-details">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">File ID:</span>
                    <span className="value">{file.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">MIME Type:</span>
                    <span className="value">{file.mimeType}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Size:</span>
                    <span className="value">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Duration:</span>
                    <span className="value">{formatDuration(file.duration)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Created:</span>
                    <span className="value">{formatDate(file.createdAt)}</span>
                  </div>
                </div>
                
                <div className="detail-actions">
                  <button
                    onClick={() => onDownload(file.id)}
                    className="detail-download-btn"
                  >
                    <span className="btn-icon">⬇️</span>
                    Re-download
                  </button>
                  
                  {file.downloadUrl && (
                    <a
                      href={file.downloadUrl}
                      download={file.name}
                      className="detail-direct-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="btn-icon">🔗</span>
                      Direct Link
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {files.length > 0 && (
        <div className="file-list-summary">
          <p>
            {files.length} recording{files.length !== 1 ? 's' : ''} • 
            Total: {storageStats.formattedTotalSize}
          </p>
        </div>
      )}
    </div>
  );
};

export default FileList;