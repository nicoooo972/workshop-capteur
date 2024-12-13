<script lang="ts">
    export let rooms: Array<any> = [];

    // Préparer les données pour le graphique
    $: chartData = rooms
        .map(room => ({
            name: room.name,
            co2: room.co2 || 0,
            temperature: room.temperature || 0,
            humidity: room.humidity || 0,
            carbonImpact: room.carbonImpact || 0
        }))
        .sort((a, b) => b.carbonImpact - a.carbonImpact); // Tri par impact carbone

    // Calcul des valeurs maximales pour l'échelle
    $: maxCO2 = Math.max(...chartData.map(d => d.co2));
    $: maxTemp = Math.max(...chartData.map(d => d.temperature));
    $: maxCarbon = Math.max(...chartData.map(d => d.carbonImpact));

    // Fonction pour calculer la largeur des barres en pourcentage
    const getBarWidth = (value: number, maxValue: number) => {
        return value ? (value / maxValue * 100) : 0;
    };

    // Fonction pour formater les valeurs
    const formatValue = (value: number, type: string) => {
        switch(type) {
            case 'co2': return `${value.toFixed(0)} ppm`;
            case 'temperature': return `${value.toFixed(1)}°C`;
            case 'carbonImpact': return value.toFixed(2);
            default: return value;
        }
    };
</script>

<div class="bg-white rounded-lg shadow-sm p-6">
    <h2 class="text-xl font-semibold mb-6">Comparaison des salles</h2>
    
    <div class="space-y-6">
        {#each chartData as room}
            <div class="space-y-2">
                <div class="text-sm font-medium">{room.name}</div>
                
                <!-- Barre pour l'impact carbone -->
                <div class="relative h-6 bg-gray-100 rounded">
                    <div 
                        class="absolute top-0 left-0 h-full bg-green-500 rounded transition-all duration-500"
                        style="width: {getBarWidth(room.carbonImpact, maxCarbon)}%"
                    >
                    </div>
                    <div class="absolute inset-0 flex items-center justify-end pr-2 text-sm">
                        {formatValue(room.carbonImpact, 'carbonImpact')}
                    </div>
                </div>

                <!-- Barre pour la température -->
                <div class="relative h-6 bg-gray-100 rounded">
                    <div 
                        class="absolute top-0 left-0 h-full bg-orange-500 rounded transition-all duration-500"
                        style="width: {getBarWidth(room.temperature, maxTemp)}%"
                    >
                    </div>
                    <div class="absolute inset-0 flex items-center justify-end pr-2 text-sm">
                        {formatValue(room.temperature, 'temperature')}
                    </div>
                </div>

                <!-- Barre pour le CO2 -->
                <div class="relative h-6 bg-gray-100 rounded">
                    <div 
                        class="absolute top-0 left-0 h-full bg-blue-500 rounded transition-all duration-500"
                        style="width: {getBarWidth(room.co2, maxCO2)}%"
                    >
                    </div>
                    <div class="absolute inset-0 flex items-center justify-end pr-2 text-sm">
                        {formatValue(room.co2, 'co2')}
                    </div>
                </div>
            </div>
        {/each}
    </div>

    <!-- Légende -->
    <div class="mt-6 flex gap-4 text-sm">
        <div class="flex items-center">
            <div class="w-3 h-3 bg-green-500 rounded mr-2"></div>
            Impact Carbone
        </div>
        <div class="flex items-center">
            <div class="w-3 h-3 bg-orange-500 rounded mr-2"></div>
            Température
        </div>
        <div class="flex items-center">
            <div class="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            CO₂
        </div>
    </div>
</div>

<style>
    /* Animation de transition pour les barres */
    .transition-all {
        transition-property: all;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        transition-duration: 500ms;
    }
</style>