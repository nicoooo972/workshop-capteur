<script lang="ts">
    import { onMount } from 'svelte';
    import { Chart } from 'chart.js/auto';
    
    export let data: any[] = [];
    export let metric: 'temperature' | 'humidity' | 'co2' = 'temperature';
    
    let selectedTab = 'forecast';
    let forecastDays = 7;
    let chart: any;
    let canvas: HTMLCanvasElement;

    const metricOptions = [
        { value: 'temperature', label: '🌡️ Température', unit: '°C' },
        { value: 'humidity', label: '💧 Humidité', unit: '%' },
        { value: 'co2', label: '📊 CO2', unit: 'ppm' }
    ];

    // Fonction pour obtenir l'unité de la métrique
    function getMetricUnit(metricName: string): string {
        return metricOptions.find(opt => opt.value === metricName)?.unit || '';
    }

    // Mise à jour des calculs de prévision avec la métrique actuelle
    $: forecastData = (() => {
        if (!data || data.length === 0) return [];

        const xValues = Array.from({ length: data.length }, (_, i) => i);
        const yValues = data.map(d => d[metric]);

        const n = data.length;
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
        const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const lastTimestamp = data[data.length - 1].timestamp;
        const msPerDay = 24 * 60 * 60 * 1000;

        return Array.from({ length: forecastDays }, (_, i) => ({
            timestamp: new Date(lastTimestamp + (i + 1) * msPerDay).toLocaleDateString(),
            [metric]: intercept + slope * (data.length + i),
            type: 'forecast'
        }));
    })();

    // Distribution mise à jour
    $: distribution = (() => {
        const values = data.map(d => d[metric]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        const bucketSize = range / 10;

        const buckets = Array.from({ length: 10 }, (_, i) => ({
            range: `${(min + i * bucketSize).toFixed(1)} - ${(min + (i + 1) * bucketSize).toFixed(1)}`,
            count: 0
        }));

        values.forEach(value => {
            const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), 9);
            buckets[bucketIndex].count++;
        });

        return buckets;
    })();

    function updateChart() {
        if (chart) {
            chart.destroy();
        }

        const unit = getMetricUnit(metric);
        let chartData;
        let chartOptions;

        if (selectedTab === 'forecast') {
            const combinedData = [...data, ...forecastData];
            chartData = {
                labels: combinedData.map(d => new Date(d.timestamp).toLocaleDateString()),
                datasets: [{
                    label: 'Valeurs réelles',
                    data: data.map(d => d[metric]),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    segment: {
                        borderDash: []
                    }
                }, {
                    label: 'Prévisions',
                    data: [...Array(data.length).fill(null), ...forecastData.map(d => d[metric])],
                    borderColor: 'rgb(234, 179, 8)',
                    backgroundColor: 'rgba(234, 179, 8, 0.5)',
                    segment: {
                        borderDash: [6, 6]
                    }
                }]
            };
            chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: unit
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.parsed.y.toFixed(1) + ' ' + unit;
                                return label;
                            }
                        }
                    }
                }
            };
        } else {
            chartData = {
                labels: distribution.map(d => d.range),
                datasets: [{
                    label: 'Distribution',
                    data: distribution.map(d => d.count),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                }]
            };
            chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: `Plages de valeurs (${unit})`
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Nombre de mesures'
                        }
                    }
                }
            };
        }

        const ctx = canvas.getContext('2d');
        chart = new Chart(ctx, {
            type: selectedTab === 'distribution' ? 'bar' : 'line',
            data: chartData,
            options: chartOptions
        });
    }

    // Réactivité améliorée pour mettre à jour le graphique quand les données ou la métrique changent
    $: {
        if (canvas && data && metric) {
            updateChart();
        }
    }

    onMount(() => {
        if (canvas && data) {
            updateChart();
        }
        return () => {
            if (chart) {
                chart.destroy();
            }
        };
    });
</script>

<div class="space-y-6">
    <!-- Onglets -->
    <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
            {#each ['forecast', 'distribution'] as tab}
                <button
                    class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        {selectedTab === tab 
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                    on:click={() => {
                        selectedTab = tab;
                        updateChart();
                    }}
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            {/each}
        </nav>
    </div>

    <!-- Contenu -->
    <div class="bg-white p-6 rounded-lg shadow-sm">
        {#if selectedTab === 'forecast'}
            <div class="mb-4">
                <h3 class="text-lg font-medium text-gray-900">
                    Prévisions sur {forecastDays} jours
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                    Basé sur la tendance des données historiques
                </p>
            </div>
        {:else}
            <div class="mb-4">
                <h3 class="text-lg font-medium text-gray-900">
                    Distribution des valeurs
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                    Répartition des mesures par intervalles
                </p>
            </div>
        {/if}

        <div class="h-[400px] relative">
            <canvas bind:this={canvas}></canvas>
        </div>
    </div>
</div>