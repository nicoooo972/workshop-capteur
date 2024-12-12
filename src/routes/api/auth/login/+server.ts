import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';

// Plus besoin de définir JWT_SECRET en dur, on utilise la variable d'environnement

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { email, password } = await request.json();

        const userRef = ref(db, 'users');
        const emailQuery = query(userRef, orderByChild('email'), equalTo(email));
        const snapshot = await get(emailQuery);

        if (!snapshot.exists()) {
            return json({ error: 'Utilisateur non trouvé' }, { status: 400 });
        }

        const userId = Object.keys(snapshot.val())[0];
        const userData = snapshot.val()[userId];

        const isValidPassword = await bcrypt.compare(password, userData.passwordHash);
        if (!isValidPassword) {
            return json({ error: 'Mot de passe incorrect' }, { status: 400 });
        }

        // Utilisation de SECRET_JWT à la place de JWT_SECRET
        const token = jwt.sign(
            {
                id: userId,
                email: userData.email,
                role: userData.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { passwordHash: _, ...userWithoutPassword } = userData;
        
        return json({ token, user: userWithoutPassword });
    } catch (error: any) {
        console.error('Erreur lors de la connexion:', error);
        return json({ error: error.message }, { status: 500 });
    }
};