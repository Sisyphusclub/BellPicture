export type GenerationMode = 'text-to-image' | 'image-to-image';

export interface ImageRecord {
  id: string;
  createdAt: string;
  prompt: string;
  model: string;
  referenceId?: string;
  width: number;
  height: number;
}

export interface UploadResponse {
  id: string;
  filename: string;
  mime: string;
  size: number;
}

export interface GenerateRequest {
  prompt: string;
  referenceId?: string;
  model?: string;
}

export interface GenerateResponse {
  id: string;
  outputUrl: string;
  filename: string;
  mime: string;
  width: number;
  height: number;
  generationMode: GenerationMode;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}

export interface HistoryEntry {
  record: ImageRecord;
  imageUrl: string;
}

export interface GeneratedImageResult {
  record: ImageRecord;
  imageUrl: string;
  generationMode: GenerationMode;
  mime: string;
  size: number;
}
