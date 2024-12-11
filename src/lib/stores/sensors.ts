import { writable } from 'svelte/store';
import { onValue, ref } from 'firebase/database';
import { db } from '$lib/firebase';
import { notifications } from './notifications';

// Types
export type SensorData = {
    co2: number;
    humidity: number;
    temperature: number;
    timestamp: number;
    title: string;
};

export type SensorRoom = {
    id: string;
    data: SensorData[];
};

const thresholds = {
    co2: [300, 600],        // ppm
    temperature: [18, 26],    // °C
    humidity: [40, 60]        // %
};

function createSensorsStore() {
    const { subscribe, set, update } = writable<SensorRoom[]>([]);
    let unsubscribes: (() => void)[] = [];

    function checkThresholds(data: SensorData) {
        // CO2
        if (data.co2 < thresholds.co2[0] || data.co2 > thresholds.co2[1]) {
            notifications.addNotification({
                type: 'co2',
                value: data.co2,
                threshold: thresholds.co2,
                timestamp: data.timestamp,
                location: data.title,
                severity: data.co2 > thresholds.co2[1] * 1.2 ? 'critical' : 'warning'
            });
        }

        // Température
        if (data.temperature < thresholds.temperature[0] || data.temperature > thresholds.temperature[1]) {
            notifications.addNotification({
                type: 'temperature',
                value: data.temperature,
                threshold: thresholds.temperature,
                timestamp: data.timestamp,
                location: data.title,
                severity: Math.abs(data.temperature - thresholds.temperature[1]) > 5 ? 'critical' : 'warning'
            });
        }

        // Humidité
        if (data.humidity < thresholds.humidity[0] || data.humidity > thresholds.humidity[1]) {
            notifications.addNotification({
                type: 'humidity',
                value: data.humidity,
                threshold: thresholds.humidity,
                timestamp: data.timestamp,
                location: data.title,
                severity: Math.abs(data.humidity - thresholds.humidity[1]) > 15 ? 'critical' : 'warning'
            });
        }
    }

    return {
        subscribe,
        init: () => {
            // Clean up any existing listeners
            unsubscribes.forEach(unsub => unsub());
            unsubscribes = [];

            // Liste des salles à surveiller
            const roomsRef = ref(db, 'dcCampus');
            onValue(roomsRef, (snapshot) => {
                const rooms: SensorRoom[] = [];
                snapshot.forEach((roomSnapshot) => {
                    const roomId = roomSnapshot.key;
                    const roomData = Object.values(roomSnapshot.val() || {});
                    
                    // Vérifier les seuils pour les dernières données
                    const latestData = [...roomData].sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
                    if (latestData) {
                        checkThresholds(latestData);
                    }

                    rooms.push({
                        id: roomId!,
                        data: roomData
                    });
                });
                set(rooms);
            });
        },
        destroy: () => {
            unsubscribes.forEach(unsub => unsub());
            unsubscribes = [];
        }
    };
}

export const sensors = createSensorsStore();