import type { Request, Response } from 'express';
import app from '../server';

export default function handler(req: Request, res: Response) {
  // Ensure req.url has /api prefix for Express router if stripped by Vercel
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
