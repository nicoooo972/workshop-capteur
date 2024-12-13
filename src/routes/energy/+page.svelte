<!-- src/routes/energy/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { onValue, ref } from 'firebase/database';
    import { db } from '$lib/firebase';
    import Header from '../Header.svelte';
    import { fetchWeather, type Weather } from '$lib/services/weather';
    import type { Recommendation, RoomInfo } from '$lib/types';
	import { analyzeConditions } from '$lib/recommendations';
    import RecommendationDialog from '$lib/components/RecommendationDialog.svelte';
    import { fetchTempoDays, type TempoDay } from '$lib/services/tempo';

    let rooms: RoomInfo[] = [];
    let weather: Weather | null = null;
    let loading = true;
    let searchQuery = '';

    function getWeatherIcon(temp: number, precipitation: number): string {
        if (precipitation > 0.5) return '🌧️';
        if (temp < 10) return '❄️';
        if (temp > 25) return '☀️';
        return '⛅';
    }

    function getRoomRecommendations(room: RoomInfo, weatherData: Weather): Recommendation[] {
    return analyzeConditions({
        roomTemp: room.temperature,
        exteriorTemp: weatherData.current.temperature,
        tempTrend: weatherData.hourly[1].temperature - weatherData.current.temperature,
        humidity: room.humidity,
        co2: room.co2,
        precipitation: weatherData.current.precipitation,
        timeOfDay: weatherData.current.isDay ? 'day' : 'night'
    });
}

    function generateRecommendation(room: RoomInfo, weatherData: Weather): string {
        const currentTemp = weatherData.current.temperature;
        const nextHourTemp = weatherData.hourly[1].temperature;
        const tempTrend = nextHourTemp - currentTemp;

        // Si la température extérieure va augmenter significativement
        if (tempTrend > 2 && room.temperature > 21) {
            return "Réduction du chauffage recommandée - Hausse des températures prévue";
        }
        
        // Si la température extérieure est agréable
        if (currentTemp >= 18 && currentTemp <= 24 && room.temperature >= 21) {
            return "Ventilation naturelle recommandée - Température extérieure idéale";
        }

        // Si la température extérieure est très élevée
        if (currentTemp > 28 && room.temperature < 25) {
            return "Activation de la climatisation conseillée - Températures extérieures élevées";
        }

        // Si la température extérieure va baisser significativement
        if (tempTrend < -2 && room.temperature < 20) {
            return "Prévoir l'activation du chauffage - Baisse des températures prévue";
        }

        return "Paramètres actuels optimaux";
    }

    function getEnergyEfficiency(roomTemp: number, targetTemp: number, exteriorTemp: number): {
        score: number;
        color: string;
        message: string;
    } {
        const tempDiff = Math.abs(roomTemp - targetTemp);
        const exteriorDiff = Math.abs(roomTemp - exteriorTemp);
        
        // Score sur 100
        let score = 100;
        score -= tempDiff * 10; // Pénalité pour l'écart avec la température cible
        score -= Math.max(0, (exteriorDiff - 5) * 5); // Pénalité si grand écart avec l'extérieur

        score = Math.max(0, Math.min(100, score)); // Borner entre 0 et 100

        if (score >= 80) return { score, color: 'bg-green-500', message: 'Excellente efficacité' };
        if (score >= 60) return { score, color: 'bg-yellow-500', message: 'Bonne efficacité' };
        return { score, color: 'bg-red-500', message: 'Amélioration possible' };
    }

    let tempoDays: { today: TempoDay; tomorrow: TempoDay } | null = null;

    function getTempoColor(code: 0 | 1 | 2 | 3): { bg: string; text: string; label: string } {
        switch (code) {
            case 1: return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Bleu' };
            case 2: return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Blanc' };
            case 3: return { bg: 'bg-red-100', text: 'text-red-800', label: 'Rouge' };
            default: return { bg: 'bg-gray-50', text: 'text-gray-600', label: 'Inconnu' };
        }
    }

    function getTempoRecommendation(code: 0 | 1 | 2 | 3): string {
        switch (code) {
            case 1: return "Tarif avantageux : idéal pour la consommation électrique";
            case 2: return "Tarif standard : consommation normale conseillée";
            case 3: return "Tarif élevé : réduire la consommation électrique au minimum";
            default: return "Tarif non communiqué";
        }
    }

    onMount(async () => {
        try {
            // Charger les données météo
            weather = await fetchWeather();
            tempoDays = await fetchTempoDays();
            // Charger les données des salles
            const roomsRef = ref(db, 'dcCampus');
            onValue(roomsRef, (snapshot) => {
    const data = snapshot.val();
    if (data && weather) {
        rooms = Object.entries(data).map(([key, value]: [string, any]) => {
            const latestData = value[Object.keys(value)[0]] || {};
            
            // Obtenir les recommandations avec la nouvelle fonction
            const roomRecommendations = analyzeConditions({
                roomTemp: latestData.temperature || 20,
                exteriorTemp: weather.current.temperature,
                tempTrend: weather.hourly[1].temperature - weather.current.temperature,
                humidity: latestData.humidity || 50,
                co2: latestData.co2 || 400,
                precipitation: weather.current.precipitation,
                timeOfDay: weather.current.isDay ? 'day' : 'night'
            });

            return {
                id: key,
                name: `Salle ${key}`,
                temperature: latestData.temperature || 20,
                humidity: latestData.humidity || 50,
                co2: latestData.co2 || 400,
                efficiency: getEnergyEfficiency(
                    latestData.temperature || 20,
                    21,
                    weather.current.temperature
                ),
                recommendations: roomRecommendations // Notez le pluriel ici
            };
        });
    }
    loading = false;
});
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            loading = false;
        }
    });

    $: filteredRooms = rooms.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
</script>

<div class="min-h-screen bg-gray-50">
    <Header 
        title="Gestion Énergétique"
        subtitle="Optimisation et recommandations"
        showBack={true}
    />

    <main class="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto space-y-6">
            <!-- Panneau météo -->
            {#if weather}
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- Conditions actuelles -->
                        <div>
                            <h3 class="text-lg font-medium text-gray-900">Conditions actuelles</h3>
                            <div class="mt-4 flex items-center gap-4">
                                <div class="text-4xl">{getWeatherIcon(weather.current.temperature, weather.current.precipitation)}</div>
                                <div>
                                    <div class="text-3xl font-bold text-gray-900">{weather.current.temperature.toFixed(1)}°C</div>
                                    <div class="text-sm text-gray-600">Humidité: {weather.current.humidity}%</div>
                                </div>
                            </div>
                        </div>

                        <!-- Prévisions -->
                        <div class="col-span-2">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Prévisions des prochaines heures</h3>
                            <div class="grid grid-cols-4 gap-4">
                                {#each weather.hourly.slice(1, 5) as forecast}
                                    <div class="text-center p-3 bg-gray-50 rounded-lg">
                                        <div class="text-sm text-gray-600">{forecast.time}</div>
                                        <div class="text-lg font-medium text-gray-900">{forecast.temperature.toFixed(1)}°C</div>
                                        <div class="text-sm text-gray-500">{forecast.precipitationProbability}% pluie</div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Recherche et filtres -->
            <div class="flex gap-4 items-center">
                <div class="relative flex-1">
                    <input
                        type="text"
                        bind:value={searchQuery}
                        placeholder="Rechercher une salle..."
                        class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>

            <!-- Liste des salles -->
            {#if loading}
                <div class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                    <p class="mt-4 text-gray-600">Chargement des données...</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {#each filteredRooms as room}
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <!-- En-tête de la carte -->
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <h3 class="text-lg font-medium text-gray-900">{room.name}</h3>
                                </div>
                            </div>

                            <!-- Métriques -->
                            <div class="grid grid-cols-3 gap-4 mb-4">
                                <div class="text-center p-2 bg-gray-50 rounded-lg">
                                    <div class="text-sm text-gray-600">Température</div>
                                    <div class="text-lg font-medium">{room.temperature.toFixed(1)}°C</div>
                                </div>
                                <div class="text-center p-2 bg-gray-50 rounded-lg">
                                    <div class="text-sm text-gray-600">Humidité</div>
                                    <div class="text-lg font-medium">{room.humidity.toFixed(0)}%</div>
                                </div>
                                <div class="text-center p-2 bg-gray-50 rounded-lg">
                                    <div class="text-sm text-gray-600">CO2</div>
                                    <div class="text-lg font-medium">{room.co2} ppm</div>
                                </div>
                            </div>

                            <!-- Recommandations -->
                            <div class="space-y-2">
                                {#each room.recommendations as rec}
                                    <div class="p-3 rounded-lg" 
                                        class:bg-red-50={rec.priority === 'high'}
                                        class:bg-yellow-50={rec.priority === 'medium'}
                                        class:bg-green-50={rec.priority === 'low'}>
                                        <RecommendationDialog message={rec.message} priority={rec.priority} />
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
            {#if tempoDays}
    <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Tarification EDF Tempo</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Aujourd'hui -->
            <div class="p-4 rounded-lg border border-gray-200">
                <h4 class="text-sm font-medium text-gray-600 mb-2">Aujourd'hui</h4>
                <div class="flex items-center justify-between">
                    <div class={`px-3 py-1 rounded-full ${getTempoColor(tempoDays.today.codeJour).bg} ${getTempoColor(tempoDays.today.codeJour).text}`}>
                        Jour {getTempoColor(tempoDays.today.codeJour).label}
                    </div>
                    <p class="text-sm text-gray-600">{getTempoRecommendation(tempoDays.today.codeJour)}</p>
                </div>
            </div>
            
            <!-- Demain -->
            <div class="p-4 rounded-lg border border-gray-200">
                <h4 class="text-sm font-medium text-gray-600 mb-2">Demain</h4>
                <div class="flex items-center justify-between">
                    <div class={`px-3 py-1 rounded-full ${getTempoColor(tempoDays.tomorrow.codeJour).bg} ${getTempoColor(tempoDays.tomorrow.codeJour).text}`}>
                        Jour {getTempoColor(tempoDays.tomorrow.codeJour).label}
                    </div>
                    <p class="text-sm text-gray-600">{getTempoRecommendation(tempoDays.tomorrow.codeJour)}</p>
                </div>
            </div>
        </div>
        <div class="mt-6 border-t border-gray-200 pt-4">
            <h4 class="text-sm font-medium text-gray-900 mb-2">À propos de l'option Tempo</h4>
            <p class="text-sm text-gray-600 mb-3">
                L'option Tempo d'EDF propose des tarifs d'électricité qui varient selon les jours de l'année. 
                L'année est composée de :
            </p>
            <ul class="text-sm text-gray-600 mb-4 space-y-1 list-disc list-inside">
                <li>300 jours Bleus (tarif avantageux)</li>
                <li>43 jours Blancs (tarif moyen)</li>
                <li>22 jours Rouges (tarif plus élevé)</li>
            </ul>
            <p class="text-sm text-gray-600">
                Pour en savoir plus sur l'option Tempo et ses avantages, consultez 
                <a 
                    href="https://particulier.edf.fr/fr/accueil/gestion-contrat/options/tempo.html#/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    class="text-indigo-600 hover:text-indigo-800 underline"
                >
                    la page dédiée sur le site d'EDF
                </a>.
            </p>
        </div>
    </div>
{/if}
        </div>
    </main>
</div>