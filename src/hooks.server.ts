import type { Handle } from '@sveltejs/kit';
import { JWT_SECRET } from '$env/static/private';
import jwt from 'jsonwebtoken';

export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('token');
    console.log("ici c le token : ", token);

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            event.locals.user = decoded;
        } catch (err) {
            event.cookies.delete('token', { path: '/' }); // Changé ici aussi
            event.locals.user = null;
        }
    }

    return resolve(event);
};