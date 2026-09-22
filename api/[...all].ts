import type { Request, Response } from 'express';
import app from '../server.ts';

export default function handler(req: Request, res: Response) {
  // Normalize req.url so Express receives standard /api/... paths
  if (!req.url || req.url === '/' || req.url === '/index') {
    req.url = '/api';
  } else if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
