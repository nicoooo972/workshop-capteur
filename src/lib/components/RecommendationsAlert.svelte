<!-- RecommendationsAlert.svelte -->
<script lang="ts">
    export let metric: 'co2' | 'temperature' | 'humidity';
    export let value: number;
    export let thresholds: [number, number];

    const recommendations = {
        co2: {
            high: [
                "Ouvrez les fenêtres pendant 5-10 minutes",
                "Activez la ventilation mécanique si disponible",
                "Réduisez le nombre de personnes dans la pièce si possible"
            ],
            low: [
                "Vérifiez le système de ventilation",
                "Assurez-vous que les capteurs fonctionnent correctement"
            ]
        },
        temperature: {
            high: [
                "Activez la climatisation",
                "Fermez les stores ou rideaux si exposé au soleil",
                "Utilisez des ventilateurs pour faire circuler l'air"
            ],
            low: [
                "Augmentez le chauffage",
                "Vérifiez l'isolation des fenêtres",
                "Fermez les portes pour conserver la chaleur"
            ]
        },
        humidity: {
            high: [
                "Activez un déshumidificateur",
                "Améliorez la ventilation",
                "Vérifiez les sources potentielles d'humidité"
            ],
            low: [
                "Utilisez un humidificateur",
                "Ajoutez des plantes d'intérieur",
                "Évitez de trop chauffer la pièce"
            ]
        }
    };

    $: [min, max] = thresholds;
    $: currentRecommendations = value > max 
        ? recommendations[metric].high 
        : value < min 
            ? recommendations[metric].low 
            : null;
</script>

{#if !currentRecommendations}
    <div class="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>
            <h3 class="text-green-800 font-medium">Niveaux optimaux</h3>
            <p class="text-green-700 text-sm">Les valeurs actuelles sont dans les normes recommandées.</p>
        </div>
    </div>
{:else}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
            <h3 class="text-red-800 font-medium">Actions recommandées</h3>
            <ul class="mt-2 space-y-1 list-disc list-inside text-red-700 text-sm">
                {#each currentRecommendations as recommendation}
                    <li>{recommendation}</li>
                {/each}
            </ul>
        </div>
    </div>
{/if}