// Augments Express's Request type so controllers/middleware can read
// req.user without casting, once requireAuth has run.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export {};
