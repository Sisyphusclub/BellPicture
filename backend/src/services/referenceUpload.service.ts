import { eq } from 'drizzle-orm';

import { db } from '../db/drizzle.js';
import { referenceUploads } from '../db/schema.js';
import { AppError } from '../errors/AppError.js';

export function recordReferenceUpload(filename: string, userId: string): void {
  db.insert(referenceUploads).values({ filename, userId, createdAt: new Date() }).run();
}

export function assertReferenceUploadOwnedBy(filename: string, userId: string): void {
  const upload = db
    .select({ userId: referenceUploads.userId })
    .from(referenceUploads)
    .where(eq(referenceUploads.filename, filename))
    .get();
  if (upload === undefined) {
    throw new AppError('BAD_REQUEST', `Reference id not found: ${filename}`, 400, undefined, {
      referenceId: filename,
    });
  }
  if (upload.userId !== userId) {
    throw new AppError(
      'FORBIDDEN',
      'Reference image is not available to this user',
      403,
      undefined,
      {
        referenceId: filename,
      },
    );
  }
}
