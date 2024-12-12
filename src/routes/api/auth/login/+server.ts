import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'votre_secret_jwt'; // À mettre dans .env en production

interface User {
    id: string;
    email: string;
    passwordHash: string;
    role: 'admin' | 'user';
    createdAt: number;
    lastLogin: number;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const { email, password } = await request.json();

        // Validation des entrées
        if (!email || !password) {
            return json(
                { error: 'Email et mot de passe requis' },
                { status: 400 }
            );
        }

        // Rechercher l'utilisateur
        const userRef = ref(db, 'users');
        const emailQuery = query(userRef, orderByChild('email'), equalTo(email));
        const snapshot = await get(emailQuery);

        if (!snapshot.exists()) {
            return json(
                { error: 'Identifiants invalides' },
                { status: 401 }
            );
        }

        // Récupérer les données utilisateur
        const userId = Object.keys(snapshot.val())[0];
        const userData: User = snapshot.val()[userId];

        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, userData.passwordHash);
        if (!isValidPassword) {
            return json(
                { error: 'Identifiants invalides' },
                { status: 401 }
            );
        }

        // Mettre à jour lastLogin
        await set(ref(db, `users/${userId}`), {
            ...userData,
            lastLogin: Date.now()
        });

        // Générer le JWT
        const token = jwt.sign(
            {
                id: userId,
                email: userData.email,
                role: userData.role
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

        // Retourner les données utilisateur sans le mot de passe
        const { passwordHash: _, ...userWithoutPassword } = userData;
        return json({ 
            user: {
                ...userWithoutPassword,
                id: userId
            }
        });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        return json(
            { error: 'Erreur lors de la connexion' },
            { status: 500 }
        );
    }
};