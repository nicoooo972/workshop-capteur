<script lang="ts">
    import { onMount } from 'svelte';
    import { Chart } from 'chart.js/auto';
    
    export let data: any[] = [];
    
    let selectedMetric: 'temperature' | 'humidity' | 'co2' = 'temperature';
    let selectedView = 'evolution';
    let chart: any;
    let canvas: HTMLCanvasElement;

    const metrics = [
        { id: 'temperature', label: '🌡️ Température', unit: '°C' },
        { id: 'humidity', label: '💧 Humidité', unit: '%' },
        { id: 'co2', label: '📊 CO2', unit: 'ppm' }
    ];
    
    // Tri chronologique des données
    $: sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    // Calcul des statistiques par période pour la métrique sélectionnée
    $: timeStats = (() => {
        if (!sortedData.length) return { day: 0, week: 0, month: 0 };
        
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;
        const week = 7 * day;
        const month = 30 * day;

        const dayData = sortedData.filter(d => now - d.timestamp < day);
        const weekData = sortedData.filter(d => now - d.timestamp < week);
        const monthData = sortedData.filter(d => now - d.timestamp < month);

        const getAvg = (arr: any[]) => arr.reduce((acc, curr) => acc + curr[selectedMetric], 0) / (arr.length || 1);

        return {
            day: getAvg(dayData),
            week: getAvg(weekData),
            month: getAvg(monthData)
        };
    })();

    // Calcul des statistiques par heure
    $: hourlyStats = (() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            values: [],
            avg: 0
        }));

        sortedData.forEach(d => {
            const hour = new Date(d.timestamp).getHours();
            hours[hour].values.push(d[selectedMetric]);
        });

        return hours.map(h => ({
            hour: h.hour,
            avg: h.values.reduce((acc, val) => acc + val, 0) / (h.values.length || 1)
        }));
    })();

    // Distribution des valeurs
    $: distribution = (() => {
        const values = sortedData.map(d => d[selectedMetric]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        const bucketSize = range / 12;

        const buckets = Array.from({ length: 12 }, (_, i) => ({
            range: `${(min + i * bucketSize).toFixed(1)} - ${(min + (i + 1) * bucketSize).toFixed(1)}`,
            count: 0
        }));

        values.forEach(value => {
            const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), 11);
            buckets[bucketIndex].count++;
        });

        return buckets;
    })();

    function getMetricUnit(metricId: string): string {
        return metrics.find(m => m.id === metricId)?.unit || '';
    }

    function updateChart() {
        if (chart) {
            chart.destroy();
        }

        const unit = getMetricUnit(selectedMetric);
        let chartData;
        let chartOptions;

        switch (selectedView) {
            case 'evolution':
                chartData = {
                    labels: sortedData.map(d => new Date(d.timestamp).toLocaleString()),
                    datasets: [{
                        label: metrics.find(m => m.id === selectedMetric)?.label,
                        data: sortedData.map(d => d[selectedMetric]),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true
                    }]
                };
                chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true,
                                text: unit
                            }
                        }
                    }
                };
                break;

            case 'hourly':
                chartData = {
                    labels: hourlyStats.map(h => `${h.hour}h`),
                    datasets: [{
                        label: 'Moyenne',
                        data: hourlyStats.map(h => h.avg),
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1
                    }]
                };
                chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true,
                                text: unit
                            }
                        }
                    }
                };
                break;

            case 'distribution':
                chartData = {
                    labels: distribution.map(d => d.range),
                    datasets: [{
                        label: 'Nombre de mesures',
                        data: distribution.map(d => d.count),
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1
                    }]
                };
                chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Nombre de mesures'
                            }
                        }
                    }
                };
                break;
        }

        const ctx = canvas.getContext('2d');
        chart = new Chart(ctx, {
            type: selectedView === 'hourly' ? 'bar' : selectedView === 'distribution' ? 'bar' : 'line',
            data: chartData,
            options: chartOptions
        });
    }

    $: {
        if (canvas && sortedData) {
            updateChart();
        }
    }

    onMount(() => {
        if (canvas && sortedData) {
            updateChart();
        }
        return () => {
            if (chart) {
                chart.destroy();
            }
        };
    });
</script>

<div class="bg-white rounded-lg shadow-sm">
    <!-- Sélection de la métrique -->
    <div class="border-b border-gray-200">
        <nav class="-mb-px flex" aria-label="Tabs">
            {#each metrics as m}
                <button
                    class="flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center
                        {selectedMetric === m.id
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                    on:click={() => {
                        selectedMetric = m.id;
                        updateChart();
                    }}
                >
                    {m.label}
                </button>
            {/each}
        </nav>
    </div>

    <!-- Statistiques -->
    <div class="grid grid-cols-3 gap-4 p-4 border-b">
        <div class="bg-gray-50 p-3 rounded-lg">
            <div class="text-sm text-gray-500">Moyenne journalière</div>
            <div class="text-xl font-semibold mt-1">
                {timeStats.day.toFixed(1)} {getMetricUnit(selectedMetric)}
            </div>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <div class="text-sm text-gray-500">Moyenne hebdomadaire</div>
            <div class="text-xl font-semibold mt-1">
                {timeStats.week.toFixed(1)} {getMetricUnit(selectedMetric)}
            </div>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <div class="text-sm text-gray-500">Moyenne mensuelle</div>
            <div class="text-xl font-semibold mt-1">
                {timeStats.month.toFixed(1)} {getMetricUnit(selectedMetric)}
            </div>
        </div>
    </div>

    <!-- Types de visualisation -->
    <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-4" aria-label="Tabs">
            {#each [
                { id: 'evolution', label: 'Évolution' },
                { id: 'hourly', label: 'Analyse horaire' },
                { id: 'distribution', label: 'Distribution' }
            ] as view}
                <button
                    class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                        {selectedView === view.id
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                    on:click={() => {
                        selectedView = view.id;
                        updateChart();
                    }}
                >
                    {view.label}
                </button>
            {/each}
        </nav>
    </div>

    <!-- Graphique -->
    <div class="p-4">
        <div class="mb-4">
            {#if selectedView === 'evolution'}
                <p class="text-sm text-gray-500">
                    Évolution des mesures au fil du temps
                </p>
            {:else if selectedView === 'hourly'}
                <p class="text-sm text-gray-500">
                    Moyennes par heure de la journée
                </p>
            {:else}
                <p class="text-sm text-gray-500">
                    Distribution des valeurs sur la période
                </p>
            {/if}
        </div>

        <div class="h-[400px] relative">
            <canvas bind:this={canvas}></canvas>
        </div>
    </div>
</div>