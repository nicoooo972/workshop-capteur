import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';


export const GET: RequestHandler = async ({ cookies }) => {
    try {
        const token = cookies.get('token');
        
        if (!token) {
            return json({ authenticated: false }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        return json({ authenticated: true, user: decoded });
    } catch (error) {
        return json({ authenticated: false }, { status: 401 });
    }
};