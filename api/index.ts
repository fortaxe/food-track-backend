import app from '../app.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const handler = async (req: VercelRequest, res: VercelResponse) => {
    // Allowed origins for CORS
    const allowedOrigins = [
        'https://food-track-frontend.vercel.app',
        'http://localhost:3000'
    ];

    const origin = req.headers.origin ?? '';
    const corsOrigin = allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] ?? '');

    // Set CORS headers for preflight requests
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, ngrok-skip-browser-warning');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Use the express app as middleware
    return new Promise((resolve, reject) => {
        // @ts-ignore
        app(req, res, (err: any) => {
            if (err) {
                return reject(err);
            }
            resolve(undefined);
        });
    });
};

export default handler;
