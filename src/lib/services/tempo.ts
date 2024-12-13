export type TempoDay = {
    dateJour: string;
    codeJour: 0 | 1 | 2 | 3;
    periode: string;
};

export async function fetchTempoDays(): Promise<{ today: TempoDay; tomorrow: TempoDay }> {
    const [todayRes, tomorrowRes] = await Promise.all([
        fetch('https://www.api-couleur-tempo.fr/api/jourTempo/today'),
        fetch('https://www.api-couleur-tempo.fr/api/jourTempo/tomorrow')
    ]);

    const today = await todayRes.json();
    const tomorrow = await tomorrowRes.json();

    return { today, tomorrow };
}