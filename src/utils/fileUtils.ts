import type { RecordedFile, FileDownloadOptions } from '../types/files';

// Generate timestamp-based filename
export const generateFilename = (
  prefix: string = 'assessment_recording',
  extension?: string,
  timestamp?: Date
): string => {
  const date = timestamp || new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  const timestampStr = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  const ext = extension || 'webm';
  
  return `${prefix}_${timestampStr}.${ext}`;
};

// Get file extension from MIME type
export const getExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'video/webm': 'webm',
    'video/mp4': 'mp4',
    'video/avi': 'avi',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi'
  };
  
  return mimeToExt[mimeType] || 'webm';
};

// Format file size in human-readable format
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format duration in human-readable format
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Create download URL for blob
export const createDownloadUrl = (blob: Blob): string => {
  return URL.createObjectURL(blob);
};

// Clean up download URL
export const revokeDownloadUrl = (url: string): void => {
  URL.revokeObjectURL(url);
};

// Download file to user's device
export const downloadFile = (
  blob: Blob,
  options: FileDownloadOptions = {}
): string => {
  const extension = getExtensionFromMimeType(blob.type);
  const filename = options.filename || generateFilename('assessment_recording', extension);
  
  const url = createDownloadUrl(blob);
  
  if (options.autoDownload !== false) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  return url;
};

// Create RecordedFile object from blob and metadata
export const createRecordedFile = (
  blob: Blob,
  duration: number,
  mimeType: string
): RecordedFile => {
  const id = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const extension = getExtensionFromMimeType(mimeType);
  const name = generateFilename('assessment_recording', extension);
  
  return {
    id,
    name,
    blob,
    size: blob.size,
    duration,
    mimeType,
    createdAt: new Date(),
    downloadUrl: createDownloadUrl(blob)
  };
};

// Estimate compression ratio
export const calculateCompressionInfo = (
  originalSize: number,
  bitrate: number,
  duration: number
): { ratio: number; efficiency: string } => {
  // Rough calculation of uncompressed video size
  // Assuming 1920x1080@30fps with 24-bit color
  const uncompressedBytesPerFrame = 1920 * 1080 * 3; // RGB
  const framesPerSecond = 30;
  const estimatedUncompressed = uncompressedBytesPerFrame * framesPerSecond * duration;
  
  const ratio = estimatedUncompressed / originalSize;
  
  let efficiency = 'Good';
  if (ratio > 100) efficiency = 'Excellent';
  else if (ratio > 50) efficiency = 'Very Good';
  else if (ratio > 20) efficiency = 'Good';
  else if (ratio > 10) efficiency = 'Fair';
  else efficiency = 'Poor';
  
  return { ratio, efficiency };
};

// Check if file size is within limits
export const isFileSizeAcceptable = (
  size: number,
  maxSizeMB: number = 100
): { acceptable: boolean; message?: string } => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  
  if (size > maxBytes) {
    return {
      acceptable: false,
      message: `File size ${formatFileSize(size)} exceeds maximum limit of ${maxSizeMB}MB`
    };
  }
  
  return { acceptable: true };
};