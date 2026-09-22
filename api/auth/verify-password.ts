import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

export const EDIT_PASSWORD = '9500';

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-edit-token, x-edit-password');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse body if not pre-parsed by Vercel
  let body: any = req.body;
  if (!body) {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  } else if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // keep as string or empty
    }
  }

  const passwordHeader = req.headers['x-edit-password'];
  const inputPassword =
    (body && typeof body.password === 'string' ? body.password : undefined) ||
    (body && typeof body.pin === 'string' ? body.pin : undefined) ||
    (typeof passwordHeader === 'string' ? passwordHeader : undefined);

  if (typeof inputPassword === 'string' && inputPassword.trim() === EDIT_PASSWORD) {
    const token = 'edit_session_' + crypto.randomBytes(24).toString('hex');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: true,
        token,
        expiresIn: 900,
        message: 'Editing unlocked',
      })
    );
    return;
  }

  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      success: false,
      error: 'Incorrect editing password',
    })
  );
}
