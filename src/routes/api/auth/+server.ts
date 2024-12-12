import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST({ request }: { request: Request }) {
    const { email, password, action } = await request.json();
    
    try {
        if (action === 'login') {
            // Logique de login
            return json({ token, user });
        } else if (action === 'register') {
            // Logique de register
            return json({ token, user });
        }
    } catch (error: any) {
        return json({ error: error.message }, { status: 400 });
    }
}