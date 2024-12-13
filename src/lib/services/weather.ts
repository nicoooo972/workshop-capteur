type WeatherResponse = {
    current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        is_day: number;
        precipitation: number;
    };
    hourly: {
        time: string[];
        temperature_2m: number[];
        relative_humidity_2m: number[];
        precipitation_probability: number[];
    };
};

export type Weather = {
    current: {
        temperature: number;
        humidity: number;
        isDay: boolean;
        precipitation: number;
    };
    hourly: Array<{
        time: string;
        temperature: number;
        humidity: number;
        precipitationProbability: number;
    }>;
};

export async function fetchWeather(): Promise<Weather> {
    try {
        // Coordonnées de Paris (à ajuster selon l'emplacement de votre campus)
        const latitude = 48.8566;
        const longitude = 2.3522;
        
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${latitude}&longitude=${longitude}` +
            `&current=temperature_2m,relative_humidity_2m,is_day,precipitation` +
            `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability` +
            `&timezone=auto`
        );

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des données météo');
        }

        const data: WeatherResponse = await response.json();

        // Formatter les données
        const weather: Weather = {
            current: {
                temperature: data.current.temperature_2m,
                humidity: data.current.relative_humidity_2m,
                isDay: data.current.is_day === 1,
                precipitation: data.current.precipitation
            },
            hourly: data.hourly.time.slice(0, 24).map((time, index) => ({
                time: new Date(time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                temperature: data.hourly.temperature_2m[index],
                humidity: data.hourly.relative_humidity_2m[index],
                precipitationProbability: data.hourly.precipitation_probability[index]
            }))
        };

        return weather;
    } catch (error) {
        console.error('Erreur du service météo:', error);
        throw error;
    }
}