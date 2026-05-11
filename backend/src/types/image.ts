export interface GenerateInput {
  prompt: string;
  /**
   * Optional reference image path under UPLOAD_DIR.
   * Not yet supported by TwoApiImageProvider — passing it triggers
   * AppError('BAD_REQUEST'). Will be wired up when task 2 adds the
   * /api/images/edits flow.
   */
  referencePath?: string;
  model?: string;
}

export interface GenerateOutput {
  /** Absolute path under OUTPUT_DIR. */
  outputPath: string;
  width: number;
  height: number;
}
