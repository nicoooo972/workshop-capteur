import { writable } from 'svelte/store';
import { ref, set, onValue, push, remove } from 'firebase/database';
import { db } from '$lib/firebase';

export type ReportSchedule = {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;  // format HH:mm
    day?: number;  // jour du mois (1-31) pour monthly, jour de la semaine (0-6) pour weekly
    recipients: string[];
    roomIds: string[];
    metrics: ('temperature' | 'humidity' | 'co2')[];
    enabled: boolean;
    lastSent?: number;
};

function createAdminSettingsStore() {
    const { subscribe, set, update } = writable<ReportSchedule[]>([]);

    return {
        subscribe,
        init: () => {
            const schedulesRef = ref(db, 'reportSchedules');
            onValue(schedulesRef, (snapshot) => {
                const data = snapshot.val() || [];
                set(Object.values(data));
            });
        },
        addSchedule: async (schedule: Omit<ReportSchedule, 'lastSent'>) => {
            const schedulesRef = ref(db, 'reportSchedules');
            const newScheduleRef = push(schedulesRef);
            await set(newScheduleRef, { ...schedule, lastSent: Date.now() });
        },
        updateSchedule: async (id: string, schedule: ReportSchedule) => {
            const scheduleRef = ref(db, `reportSchedules/${id}`);
            await set(scheduleRef, schedule);
        },
        deleteSchedule: async (id: string) => {
            const scheduleRef = ref(db, `reportSchedules/${id}`);
            await remove(scheduleRef);
        }
    };
}

export const adminSettings = createAdminSettingsStore();