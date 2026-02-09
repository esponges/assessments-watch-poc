import { useState, useCallback } from 'react';
import type { RecordedFile, FileManagerState } from '../types/files';
import { 
  createRecordedFile, 
  downloadFile, 
  revokeDownloadUrl,
  formatFileSize 
} from './fileUtils';

const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB

export const useFileManager = () => {
  const [fileState, setFileState] = useState<FileManagerState>({
    files: [],
    totalSize: 0,
    maxFiles: MAX_FILES
  });

  // Add a new recorded file
  const addFile = useCallback((
    blob: Blob,
    duration: number,
    mimeType: string
  ): RecordedFile => {
    const newFile = createRecordedFile(blob, duration, mimeType);

    setFileState(prev => {
      const newFiles = [...prev.files];
      const newTotalSize = prev.totalSize + blob.size;

      // Check if we need to remove old files to make space
      while (
        newFiles.length >= MAX_FILES || 
        newTotalSize > MAX_TOTAL_SIZE
      ) {
        const removedFile = newFiles.shift();
        if (removedFile?.downloadUrl) {
          revokeDownloadUrl(removedFile.downloadUrl);
        }
      }

      return {
        ...prev,
        files: [...newFiles, newFile],
        totalSize: newFiles.reduce((sum, file) => sum + file.size, 0) + blob.size
      };
    });

    return newFile;
  }, []);

  // Remove a file
  const removeFile = useCallback((fileId: string) => {
    setFileState(prev => {
      const fileToRemove = prev.files.find(f => f.id === fileId);
      if (fileToRemove?.downloadUrl) {
        revokeDownloadUrl(fileToRemove.downloadUrl);
      }

      const newFiles = prev.files.filter(f => f.id !== fileId);
      return {
        ...prev,
        files: newFiles,
        totalSize: newFiles.reduce((sum, file) => sum + file.size, 0)
      };
    });
  }, []);

  // Download a file
  const downloadFileById = useCallback((fileId: string, customFilename?: string) => {
    const file = fileState.files.find(f => f.id === fileId);
    if (!file) {
      console.error('File not found:', fileId);
      return null;
    }

    return downloadFile(file.blob, {
      filename: customFilename || file.name,
      autoDownload: true
    });
  }, [fileState.files]);

  // Get file by ID
  const getFile = useCallback((fileId: string): RecordedFile | null => {
    return fileState.files.find(f => f.id === fileId) || null;
  }, [fileState.files]);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    // Clean up all download URLs
    fileState.files.forEach(file => {
      if (file.downloadUrl) {
        revokeDownloadUrl(file.downloadUrl);
      }
    });

    setFileState(prev => ({
      ...prev,
      files: [],
      totalSize: 0
    }));
  }, [fileState.files]);

  // Get storage statistics
  const getStorageStats = useCallback(() => {
    return {
      fileCount: fileState.files.length,
      totalSize: fileState.totalSize,
      formattedTotalSize: formatFileSize(fileState.totalSize),
      maxFiles: MAX_FILES,
      maxTotalSize: MAX_TOTAL_SIZE,
      formattedMaxSize: formatFileSize(MAX_TOTAL_SIZE),
      usagePercentage: (fileState.totalSize / MAX_TOTAL_SIZE) * 100
    };
  }, [fileState]);

  // Check if we can add a new file
  const canAddFile = useCallback((fileSize: number): { canAdd: boolean; reason?: string } => {
    if (fileState.files.length >= MAX_FILES) {
      return { 
        canAdd: false, 
        reason: `Maximum file limit (${MAX_FILES}) reached. Oldest files will be removed automatically.` 
      };
    }

    if (fileState.totalSize + fileSize > MAX_TOTAL_SIZE) {
      return { 
        canAdd: false, 
        reason: `Storage limit (${formatFileSize(MAX_TOTAL_SIZE)}) would be exceeded. Oldest files will be removed automatically.` 
      };
    }

    return { canAdd: true };
  }, [fileState]);

  return {
    files: fileState.files,
    totalSize: fileState.totalSize,
    addFile,
    removeFile,
    downloadFileById,
    getFile,
    clearAllFiles,
    getStorageStats,
    canAddFile
  };
};