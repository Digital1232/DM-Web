/**
 * Media-related types and enums
 * Defines types for media submissions including format, type, and validation
 */

/**
 * Supported media formats for videos
 */
export enum VideoFormat {
  MP4 = 'mp4',
  MOV = 'mov',
  WEBM = 'webm'
}

/**
 * Supported media formats for posters
 */
export enum PosterFormat {
  PNG = 'png',
  JPG = 'jpg',
  SVG = 'svg'
}

/**
 * Type of media submission
 */
export enum MediaType {
  VIDEO = 'video',
  POSTER = 'poster'
}

/**
 * Valid media formats by type
 */
export const VALID_MEDIA_FORMATS: Record<MediaType, string[]> = {
  [MediaType.VIDEO]: Object.values(VideoFormat),
  [MediaType.POSTER]: Object.values(PosterFormat)
};

/**
 * Media file information
 */
export interface MediaFile {
  fileName: string;
  format: string; // VideoFormat or PosterFormat value
  fileSize: number; // in bytes
  storageUrl: string;
  thumbnailUrl?: string;
  uploadTimestamp: number; // Unix milliseconds
  hash?: string; // For duplicate detection
}

/**
 * Media validation error
 */
export interface MediaValidationError {
  type: 'unsupported_format' | 'corrupted_file' | 'size_exceeds_limit' | 'unknown_error';
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Media constraint limits
 */
export const MEDIA_CONSTRAINTS = {
  VIDEO: {
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
    maxDurationSeconds: 3600 // 1 hour
  },
  POSTER: {
    maxSizeBytes: 50 * 1024 * 1024 // 50MB
  }
};
