export interface RecordedFile {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  duration: number;
  mimeType: string;
  createdAt: Date;
  downloadUrl?: string;
}

export interface FileDownloadOptions {
  filename?: string;
  autoDownload?: boolean;
}

export interface FileManagerState {
  files: RecordedFile[];
  totalSize: number;
  maxFiles: number;
}