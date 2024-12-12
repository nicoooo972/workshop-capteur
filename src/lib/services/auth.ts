// $lib/services/auth.ts
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { auth } from '$lib/stores/auth';

interface User {
    id: string;
    email: string;
    role: 'admin' | 'user';
    nom?: string;
    prenom?: string;
    createdAt: number;
    lastLogin: number;
}

interface AuthResponse {
    token: string;
    user: Omit<User, 'passwordHash'>;
}

class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

export const authService = {
    async register(
        email: string, 
        password: string, 
        userData: Partial<User>
    ): Promise<AuthResponse> {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    ...userData
                }),
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new AuthError(error.message || 'Erreur lors de l\'inscription');
            }

            const data = await response.json();
            
            if (browser) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            return data;
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            throw error instanceof AuthError ? error : new AuthError('Erreur lors de l\'inscription');
        }
    },

    async login(email: string, password: string): Promise<AuthResponse> {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new AuthError(error.message || 'Erreur lors de la connexion');
            }

            const data = await response.json();
            
            if (browser) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            return data;
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            throw error instanceof AuthError ? error : new AuthError('Erreur lors de la connexion');
        }
    },

    async logout(): Promise<void> {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            auth.logout();
            goto('/');
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
        }
    },


    async checkAuth(): Promise<boolean> {
        try {
            const response = await fetch('/api/auth/verify');
            const data = await response.json();
            
            if (data.authenticated && data.user) {
                auth.login(data.user);
                return true;
            } else {
                auth.logout();
                return false;
            }
        } catch (error) {
            console.error('Erreur de vérification auth:', error);
            auth.logout();
            return false;
        }
    },
    

    getToken(): string | null {
        if (browser) {
            return localStorage.getItem('token');
        }
        return null;
    },

    getUser(): Partial<User> | null {
        if (browser) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    return JSON.parse(userStr);
                } catch {
                    return null;
                }
            }
        }
        return null;
    },

    isAuthenticated(): boolean {
        return !!this.getToken();
    },

    async verifyToken(): Promise<boolean> {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.ok;
        } catch {
            return false;
        }
    },

    // Méthode utilitaire pour les requêtes authentifiées
    async fetchAuthenticated(url: string, options: RequestInit = {}): Promise<Response> {
        const token = this.getToken();
        
        if (!token) {
            throw new AuthError('Non authentifié');
        }

        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            // Token expiré ou invalide
            await this.logout();
            throw new AuthError('Session expirée');
        }

        return response;
    }
};