import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';


export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const { email, password } = await request.json();

        // Rechercher l'utilisateur
        const userRef = ref(db, 'users');
        const emailQuery = query(userRef, orderByChild('email'), equalTo(email));
        const snapshot = await get(emailQuery);

        if (!snapshot.exists()) {
            return json({ error: 'Utilisateur non trouvé' }, { status: 400 });
        }

        // Récupérer les données utilisateur
        const userId = Object.keys(snapshot.val())[0];
        const userData = snapshot.val()[userId];

        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, userData.passwordHash);
        if (!isValidPassword) {
            return json({ error: 'Mot de passe incorrect' }, { status: 400 });
        }

        // Toujours générer un nouveau token au login
        const token = jwt.sign(
            {
                id: userId,
                email: userData.email,
                role: userData.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Supprimer l'ancien token et définir le nouveau
        cookies.delete('token', { path: '/' });
        cookies.set('token', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 // 24 heures
        });

        const { passwordHash: _, ...userWithoutPassword } = userData;
        return json({ user: userWithoutPassword });
    } catch (error: any) {
        console.error('Erreur lors de la connexion:', error);
        return json({ error: error.message }, { status: 500 });
    }
};