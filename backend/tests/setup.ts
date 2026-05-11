import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = mkdtempSync(path.join(tmpdir(), 'ref2image-test-'));

process.env.IMAGE_API_BASE_URL ??= 'https://test.example.com';
process.env.IMAGE_API_KEY ??= 'test-key';
process.env.LOG_LEVEL ??= 'silent';
process.env.UPLOAD_DIR ??= path.join(root, 'uploads');
process.env.OUTPUT_DIR ??= path.join(root, 'outputs');
