// stores/notifications.ts
import { writable } from 'svelte/store';
import { ref, push, update, query, orderByChild, equalTo, get, onValue } from 'firebase/database';
import { db } from '$lib/firebase';

export interface Notification {
    id: string;
    type: 'temperature' | 'humidity' | 'co2';
    value: number;
    threshold: [number, number];
    timestamp: number;
    location: string;
    roomId: string;
    severity: 'warning' | 'critical';
    isRead: boolean;
    isDeleted: boolean;
}

function createNotificationsStore() {
    const { subscribe, set, update } = writable<Notification[]>([]);

    return {
        subscribe,
        
        // Ajouter une nouvelle notification
        async add(notification: Omit<Notification, 'id' | 'isRead' | 'isDeleted'>) {
            const notificationsRef = ref(db, 'notifications');
            const roomNotificationsQuery = query(
                ref(db, 'notifications'),
                orderByChild('roomId'),
                equalTo(notification.roomId)
            );

            // Vérifier si une notification similaire existe déjà pour cette salle
            const snapshot = await get(roomNotificationsQuery);
            const existingNotifications = snapshot.val() || {};
            
            const similarNotification = Object.values<Notification>(existingNotifications)
                .find(n => 
                    !n.isDeleted && 
                    n.type === notification.type && 
                    Math.abs(n.timestamp - notification.timestamp) < 300000 // 5 minutes
                );

            if (!similarNotification) {
                const newNotification = {
                    ...notification,
                    isRead: false,
                    isDeleted: false
                };
                await push(notificationsRef, newNotification);
            }
        },

        // Marquer une notification comme lue
        async markAsRead(notificationId: string) {
            const notificationRef = ref(db, `notifications/${notificationId}`);
            await update(notificationRef, { isRead: true });
        },

        // Marquer toutes les notifications comme lues
        async markAllAsRead() {
            const notificationsRef = ref(db, 'notifications');
            const snapshot = await get(notificationsRef);
            const updates: Record<string, any> = {};
            
            snapshot.forEach(child => {
                if (!child.val().isDeleted) {
                    updates[`${child.key}/isRead`] = true;
                }
            });
            
            await update(notificationsRef, updates);
        },

        // Marquer une notification comme supprimée
        async delete(notificationId: string) {
            const notificationRef = ref(db, `notifications/${notificationId}`);
            await update(notificationRef, { isDeleted: true });
        },

        // Initialiser l'écoute des notifications
        init() {
            const notificationsRef = ref(db, 'notifications');
            onValue(notificationsRef, (snapshot) => {
                const notifications: Notification[] = [];
                snapshot.forEach((child) => {
                    const notification = {
                        id: child.key,
                        ...child.val()
                    };
                    if (!notification.isDeleted) {
                        notifications.push(notification);
                    }
                });
                // Trier par timestamp décroissant
                set(notifications.sort((a, b) => b.timestamp - a.timestamp));
            });
        }
    };
}

export const notifications = createNotificationsStore();