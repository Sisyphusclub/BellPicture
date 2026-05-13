export {};

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
    user?: AuthUser;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
}
