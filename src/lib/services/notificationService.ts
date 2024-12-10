import { writable } from 'svelte/store';

// Store pour gérer l'état des notifications
export const notificationPermission = writable<NotificationPermission>('default');

// Types de notifications
export type NotificationType = 'alert' | 'info' | 'warning';

interface NotificationOptions {
    title: string;
    message: string;
    type: NotificationType;
    duration?: number;
}

// Fonction pour demander la permission
export async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        notificationPermission.set(permission);
        return permission;
    } catch (error) {
        console.error('Erreur lors de la demande de permission:', error);
        return 'denied';
    }
}

// Fonction pour envoyer une notification
export async function sendNotification({ title, message, type, duration = 5000 }: NotificationOptions) {
    try {
        // Vérifier si le navigateur supporte les notifications
        if (!('Notification' in window)) {
            console.warn('Ce navigateur ne supporte pas les notifications bureau');
            return;
        }

        // Vérifier la permission
        let permission = await Notification.permission;
        if (permission === 'default') {
            permission = await requestNotificationPermission();
        }

        if (permission === 'granted') {
            // Créer et afficher la notification
            const notification = new Notification(title, {
                body: message,
                icon: type === 'alert' ? '/alert-icon.png' : '/info-icon.png',
                tag: type,
            });

            // Fermer automatiquement après la durée spécifiée
            setTimeout(() => notification.close(), duration);
        }
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
    }
}