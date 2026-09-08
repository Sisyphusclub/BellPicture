import type { GenerateInput, GenerateOutput } from '../../types/image.js';

export interface ProviderCredentialValidationInput {
  credential: string;
  model: string;
  requestId?: string;
  signal?: AbortSignal;
}

export interface ImageGenerationProvider {
  generate(input: GenerateInput): Promise<GenerateOutput>;
  validateCredential?: (input: ProviderCredentialValidationInput) => Promise<void>;
}
