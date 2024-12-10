import { writable } from 'svelte/store';

export type Notification = {
    id: string;
    type: 'co2' | 'temperature' | 'humidity';
    value: number;
    threshold: [number, number];
    timestamp: number;
    location: string;
    severity: 'warning' | 'critical';
    isRead: boolean;
};

function createNotificationsStore() {
    const { subscribe, set, update } = writable<Notification[]>([]);

    return {
        subscribe,
        addNotification: (notification: Omit<Notification, 'id' | 'isRead'>) => {
            update(notifications => {
                const id = crypto.randomUUID();
                return [...notifications, { ...notification, id, isRead: false }];
            });
        },
        markAsRead: (id: string) => {
            update(notifications =>
                notifications.map(n => 
                    n.id === id ? { ...n, isRead: true } : n
                )
            );
        },
        markAllAsRead: () => {
            update(notifications =>
                notifications.map(n => ({ ...n, isRead: true }))
            );
        },
        clear: () => set([])
    };
}

export const notifications = createNotificationsStore();