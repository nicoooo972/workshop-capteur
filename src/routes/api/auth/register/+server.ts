import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/firebase';
import { ref, push, get, query, orderByChild, equalTo, set } from 'firebase/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '$env/static/private';


export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const { email, password, ...userData } = await request.json();

        // Vérifier si l'utilisateur existe
        const userRef = ref(db, 'users');
        const emailQuery = query(userRef, orderByChild('email'), equalTo(email));
        const snapshot = await get(emailQuery);

        if (snapshot.exists()) {
            return json({ error: 'Cet email est déjà utilisé' }, { status: 400 });
        }

        // Hash du mot de passe
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Créer l'utilisateur avec un ID généré par Firebase
        const newUserRef = push(ref(db, 'users'));
        const userId = newUserRef.key;

        const newUser = {
            id: userId,
            email,
            passwordHash,
            role: 'user',
            ...userData,
            createdAt: Date.now(),
            lastLogin: Date.now()
        };

        await set(newUserRef, newUser);

        // Générer le JWT
        const token = jwt.sign(
            { 
                id: userId,
                email,
                role: newUser.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Définir le cookie
        cookies.set('token', token, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 // 24 heures
        });

        const { passwordHash: _, ...userWithoutPassword } = newUser;
        return json({ user: userWithoutPassword });
    } catch (error: any) {
        console.error('Erreur lors de l\'inscription:', error);
        return json({ error: error.message }, { status: 500 });
    }
};

