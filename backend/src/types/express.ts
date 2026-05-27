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
  username?: string | null;
  name?: string;
  image?: string | null;
  isAdmin?: boolean;
}
