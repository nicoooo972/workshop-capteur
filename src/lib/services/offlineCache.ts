import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SensorData {
    co2: number;
    humidity: number;
    temperature: number;
    timestamp: number;
    title: string;
}

interface SensorDataDB extends DBSchema {
    sensorData: {
        key: string;
        value: SensorData;
        indexes: { 'by-timestamp': number };
    };
    meta: {
        key: string;
        value: {
            lastSync: number;
            roomId: string;
        };
    };
}

class OfflineCache {
    private db: IDBPDatabase<SensorDataDB>;
    private readonly DB_NAME = 'sensor-data-cache';
    private readonly STORE_NAME = 'sensorData';

    async initialize() {
        this.db = await openDB<SensorDataDB>(this.DB_NAME, 1, {
            upgrade(db) {
                // Store pour les données des capteurs
                const store = db.createObjectStore('sensorData', {
                    keyPath: 'id'
                });
                store.createIndex('by-timestamp', 'timestamp');

                // Store pour les métadonnées
                db.createObjectStore('meta');
            }
        });
    }

    async cacheSensorData(roomId: string, data: SensorData) {
        if (!this.db) await this.initialize();

        const tx = this.db.transaction(['sensorData', 'meta'], 'readwrite');
        
        // Sauvegarder les données
        await tx.objectStore('sensorData').put({
            id: `${roomId}-${data.timestamp}`,
            ...data
        });

        // Mettre à jour la dernière synchronisation
        await tx.objectStore('meta').put({
            lastSync: Date.now(),
            roomId
        }, 'syncInfo');

        await tx.done;
    }

    async getCachedData(roomId: string, fromTimestamp: number): Promise<SensorData[]> {
        if (!this.db) await this.initialize();

        const range = IDBKeyRange.bound(
            `${roomId}-${fromTimestamp}`,
            `${roomId}-${Date.now()}`
        );

        return this.db.getAllFromIndex('sensorData', 'by-timestamp', range);
    }

    async clearOldData(olderThan: number) {
        if (!this.db) await this.initialize();

        const tx = this.db.transaction('sensorData', 'readwrite');
        const store = tx.objectStore('sensorData');
        const range = IDBKeyRange.upperBound(olderThan);
        
        await store.delete(range);
        await tx.done;
    }

    async getLastSyncInfo(): Promise<{ lastSync: number; roomId: string } | null> {
        if (!this.db) await this.initialize();
        return this.db.get('meta', 'syncInfo');
    }
}

export const offlineCache = new OfflineCache();