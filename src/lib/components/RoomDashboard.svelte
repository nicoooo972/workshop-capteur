<script lang="ts">
    export let rooms: any[] = [];

    // Calcul des statistiques
    $: stats = (() => {
        if (!rooms.length) return null;

        // Trier les salles par différents critères
        const sortedByTemp = [...rooms].sort((a, b) => (b.temperature || 0) - (a.temperature || 0));
        const sortedByCO2 = [...rooms].sort((a, b) => (b.co2 || 0) - (a.co2 || 0));
        const sortedByCarbon = [...rooms].sort((a, b) => (b.carbonImpact || 0) - (a.carbonImpact || 0));

        return {
            worstTemp: sortedByTemp[0],
            worstCO2: sortedByCO2[0],
            worstCarbon: sortedByCarbon[0],
            avgTemp: rooms.reduce((acc, room) => acc + (room.temperature || 0), 0) / rooms.length,
            avgCO2: rooms.reduce((acc, room) => acc + (room.co2 || 0), 0) / rooms.length,
            avgCarbon: rooms.reduce((acc, room) => acc + (room.carbonImpact || 0), 0) / rooms.length,
        };
    })();
</script>

{#if stats}
<div class="w-full bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
    <div class="p-4 sm:p-6">
        <h2 class="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Tableau de bord des salles</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Température -->
            <div class="bg-orange-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold text-orange-700">Température</h3>
                <div class="mt-2 space-y-2">
                    <p class="text-sm text-orange-600">
                        Salle la plus chaude: {stats.worstTemp?.name} ({stats.worstTemp?.temperature?.toFixed(1)}°C)
                    </p>
                    <p class="text-sm text-orange-600">
                        Moyenne: {stats.avgTemp.toFixed(1)}°C
                    </p>
                </div>
            </div>

            <!-- CO2 -->
            <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold text-blue-700">CO2</h3>
                <div class="mt-2 space-y-2">
                    <p class="text-sm text-blue-600">
                        Niveau le plus élevé: {stats.worstCO2?.name} ({stats.worstCO2?.co2?.toFixed(0)} ppm)
                    </p>
                    <p class="text-sm text-blue-600">
                        Moyenne: {stats.avgCO2.toFixed(0)} ppm
                    </p>
                </div>
            </div>

            <!-- Impact Carbone -->
            <div class="bg-green-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold text-green-700">Impact Carbone</h3>
                <div class="mt-2 space-y-2">
                    <p class="text-sm text-green-600">
                        Impact le plus élevé: {stats.worstCarbon?.name} ({stats.worstCarbon?.carbonImpact?.toFixed(2)})
                    </p>
                    <p class="text-sm text-green-600">
                        Moyenne: {stats.avgCarbon.toFixed(2)}
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
{/if}