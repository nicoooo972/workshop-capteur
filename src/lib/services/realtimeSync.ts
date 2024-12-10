import { ref, onValue, off } from 'firebase/database';
import { db } from '$lib/firebase';
import { writable } from 'svelte/store';
import { offlineCache } from './offlineCache';
import { sendNotification } from './notificationService';

interface SyncStatus {
    status: 'online' | 'offline' | 'syncing';
    lastSync: Date | null;
    error: string | null;
}

export const syncStatus = writable<SyncStatus>({
    status: 'online',
    lastSync: null,
    error: null
});

class RealtimeSync {
    private listeners: Map<string, Function> = new Map();
    private retryTimeout: NodeJS.Timeout | null = null;
    private readonly MAX_RETRIES = 3;
    private retryCount = 0;

    constructor() {
        // Écouter les changements de connectivité
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    async startSync(roomId: string, onData: (data: any) => void) {
        if (this.listeners.has(roomId)) return;

        const roomRef = ref(db, `dcCampus/${roomId}`);
        
        const listener = onValue(roomRef, 
            async (snapshot) => {
                try {
                    const data = snapshot.val();
                    if (data) {
                        // Mettre à jour le cache
                        await offlineCache.cacheSensorData(roomId, data);
                        
                        // Mettre à jour le statut de synchronisation
                        syncStatus.set({
                            status: 'online',
                            lastSync: new Date(),
                            error: null
                        });

                        // Vérifier les alertes et envoyer des notifications si nécessaire
                        this.checkAlerts(data);

                        // Appeler le callback avec les données
                        onData(data);
                    }
                } catch (error) {
                    console.error('Erreur de synchronisation:', error);
                    this.handleSyncError(error);
                }
            },
            (error) => {
                console.error('Erreur Firebase:', error);
                this.handleSyncError(error);
            }
        );

        this.listeners.set(roomId, listener);
    }

    stopSync(roomId: string) {
        const listener = this.listeners.get(roomId);
        if (listener) {
            const roomRef = ref(db, `dcCampus/${roomId}`);
            off(roomRef, 'value', listener as any);
            this.listeners.delete(roomId);
        }
    }

    private handleSyncError(error: any) {
        syncStatus.set({
            status: 'offline',
            lastSync: new Date(),
            error: error.message
        });

        // Tentative de reconnexion
        if (this.retryCount < this.MAX_RETRIES) {
            this.retryCount++;
            if (this.retryTimeout) clearTimeout(this.retryTimeout);
            this.retryTimeout = setTimeout(() => {
                this.retrySync();
            }, this.retryCount * 5000); // Augmentation progressive du délai
        }
    }

    private async retrySync() {
        syncStatus.set({
            status: 'syncing',
            lastSync: null,
            error: null
        });

        // Réinitialiser toutes les connexions
        for (const [roomId, listener] of this.listeners.entries()) {
            this.stopSync(roomId);
            const cachedData = await offlineCache.getCachedData(roomId, Date.now() - 86400000);
            if (cachedData.length > 0) {
                listener(cachedData[cachedData.length - 1]);
            }
        }
    }

    private async handleOnline() {
        this.retryCount = 0;
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
        await this.retrySync();
    }

    private handleOffline() {
        syncStatus.set({
            status: 'offline',
            lastSync: new Date(),
            error: 'Connexion Internet perdue'
        });
    }

    private checkAlerts(data: any) {
        // Vérifier les seuils et envoyer des notifications si nécessaire
        const { co2, temperature, humidity } = data;
        const alerts = [];

        if (co2 > 1000) {
            alerts.push(`CO2 élevé: ${co2} ppm`);
        }
        if (temperature < 18 || temperature > 26) {
            alerts.push(`Température anormale: ${temperature}°C`);
        }
        if (humidity < 30 || humidity > 70) {
            alerts.push(`Humidité anormale: ${humidity}%`);
        }

        if (alerts.length > 0) {
            sendNotification({
                title: 'Alertes détectées',
                message: alerts.join('\n'),
                type: 'alert'
            });
        }
    }
}

export const realtimeSync = new RealtimeSync();