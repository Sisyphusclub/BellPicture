import type { GenerateInput, GenerateOutput } from '../../types/image.js';

export interface ImageGenerationProvider {
  generate(input: GenerateInput): Promise<GenerateOutput>;
}
