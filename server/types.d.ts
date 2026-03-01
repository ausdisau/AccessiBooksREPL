declare module 'passport-microsoft';
declare module 'passport-auth0';

// Extend Express Request to include Passport authentication methods
declare global {
  namespace Express {
    interface Request {
      user?: import('@shared/schema').User;
      isAuthenticated(): boolean;
      login(user: any, callback: (err?: any) => void): void;
      logout(callback: (err?: any) => void): void;
      session?: {
        destroy(callback: (err?: any) => void): void;
        [key: string]: any;
      };
    }
  }
}