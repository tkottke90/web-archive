export const SYSTEM_TAGS = {
  NSFW: 'NSFW'
} as const;

export const NS_PER_SEC = 1e9;
export const NS_TO_MS = 1e6;

export const FS_CONSTS = {
  MAX_UPLOAD_SIZE: 25 * 1024 * 1024,
  VIDEO_CHUNK_SIZE: 10 ** 6
};

export const JOB_STATUS = {
  QUEUED: 'QUEUED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR'
} as const;
