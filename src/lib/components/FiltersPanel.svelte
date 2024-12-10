<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    export let thresholds: Record<string, [number, number]>;
    export let activeFilters: {
        dateRange: [Date, Date] | null;
        metrics: {
            co2: boolean;
            temperature: boolean;
            humidity: boolean;
        };
        alertsOnly: boolean;
    };

    const dispatch = createEventDispatcher();

    function updateFilters() {
        dispatch('filterUpdate', activeFilters);
    }

    function resetFilters() {
        activeFilters = {
            dateRange: null,
            metrics: {
                co2: true,
                temperature: true,
                humidity: true
            },
            alertsOnly: false
        };
        updateFilters();
    }
</script>

<div class="bg-white rounded-lg shadow-sm p-6 space-y-6">
    <div>
        <h3 class="text-lg font-medium mb-4">Filtres avancés</h3>
        <div class="space-y-4">
            <!-- Période personnalisée -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Période personnalisée</label>
                <div class="grid grid-cols-2 gap-4">
                    <input 
                        type="datetime-local" 
                        class="form-input rounded-md"
                        bind:value={activeFilters.dateRange[0]}
                        on:change={updateFilters}
                    />
                    <input 
                        type="datetime-local"
                        class="form-input rounded-md"
                        bind:value={activeFilters.dateRange[1]}
                        on:change={updateFilters}
                    />
                </div>
            </div>

            <!-- Métriques -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Métriques à afficher</label>
                <div class="space-y-2">
                    <label class="flex items-center">
                        <input 
                            type="checkbox"
                            class="form-checkbox rounded text-indigo-600"
                            bind:checked={activeFilters.metrics.co2}
                            on:change={updateFilters}
                        />
                        <span class="ml-2">CO2 ({thresholds.co2[0]} - {thresholds.co2[1]} ppm)</span>
                    </label>
                    <label class="flex items-center">
                        <input 
                            type="checkbox"
                            class="form-checkbox rounded text-indigo-600"
                            bind:checked={activeFilters.metrics.temperature}
                            on:change={updateFilters}
                        />
                        <span class="ml-2">Température ({thresholds.temperature[0]} - {thresholds.temperature[1]} °C)</span>
                    </label>
                    <label class="flex items-center">
                        <input 
                            type="checkbox"
                            class="form-checkbox rounded text-indigo-600"
                            bind:checked={activeFilters.metrics.humidity}
                            on:change={updateFilters}
                        />
                        <span class="ml-2">Humidité ({thresholds.humidity[0]} - {thresholds.humidity[1]} %)</span>
                    </label>
                </div>
            </div>

            <!-- Filtres supplémentaires -->
            <div>
                <label class="flex items-center">
                    <input 
                        type="checkbox"
                        class="form-checkbox rounded text-indigo-600"
                        bind:checked={activeFilters.alertsOnly}
                        on:change={updateFilters}
                    />
                    <span class="ml-2">Afficher uniquement les alertes</span>
                </label>
            </div>
        </div>
    </div>

    <div class="flex justify-end">
        <button
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            on:click={resetFilters}
        >
            Réinitialiser les filtres
        </button>
    </div>
</div>