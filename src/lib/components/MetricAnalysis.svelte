<script lang="ts">
    import { onMount } from 'svelte';
    import { Chart } from 'chart.js/auto';
    
    export let data: any[] = [];
    export let metric: 'temperature' | 'humidity' | 'co2';
    export let title: string;
    export let unit: string;
    
    let selectedView = 'evolution';
    let chart: any;
    let canvas: HTMLCanvasElement;

    export let expandAll = false;

// Mettre à jour isExpanded quand expandAll change
    $: isExpanded = expandAll;

    // Tri chronologique des données
    $: sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    // Calcul des statistiques par période
    $: timeStats = (() => {
        if (!sortedData.length) return { day: 0, week: 0, month: 0 };
        
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;
        const week = 7 * day;
        const month = 30 * day;

        const dayData = sortedData.filter(d => now - d.timestamp < day);
        const weekData = sortedData.filter(d => now - d.timestamp < week);
        const monthData = sortedData.filter(d => now - d.timestamp < month);

        return {
            day: dayData.reduce((acc, curr) => acc + curr[metric], 0) / (dayData.length || 1),
            week: weekData.reduce((acc, curr) => acc + curr[metric], 0) / (weekData.length || 1),
            month: monthData.reduce((acc, curr) => acc + curr[metric], 0) / (monthData.length || 1)
        };
    })();

    // Calcul des statistiques par heure de la journée
    $: hourlyStats = (() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            values: [],
            avg: 0
        }));

        sortedData.forEach(d => {
            const hour = new Date(d.timestamp).getHours();
            hours[hour].values.push(d[metric]);
        });

        return hours.map(h => ({
            hour: h.hour,
            avg: h.values.reduce((acc, val) => acc + val, 0) / (h.values.length || 1)
        }));
    })();

    // Distribution des valeurs
    $: distribution = (() => {
        const values = sortedData.map(d => d[metric]);
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

    function updateChart() {
        if (chart) {
            chart.destroy();
        }

        let chartData;
        let chartOptions;

        switch (selectedView) {
            case 'evolution':
                // Graphique d'évolution dans le temps
                chartData = {
                    labels: sortedData.map(d => new Date(d.timestamp).toLocaleString()),
                    datasets: [{
                        label: title,
                        data: sortedData.map(d => d[metric]),
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
                // Graphique des moyennes par heure
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
                // Histogramme de distribution
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
    <div class="p-4 border-b">
        <h3 class="text-lg font-medium text-gray-900">{title}</h3>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-3 gap-4 p-4 border-b">
        <div class="bg-gray-50 p-3 rounded-lg">
            <div class="text-sm text-gray-500">Moyenne journalière</div>
            <div class="text-xl font-semibold mt-1">{timeStats.day.toFixed(1)} {unit}</div>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <div class="text-sm text-gray-500">Moyenne hebdomadaire</div>
            <div class="text-xl font-semibold mt-1">{timeStats.week.toFixed(1)} {unit}</div>
        </div>
        <div class="bg-gray-50 p-3 rounded-lg">
            <div class="text-sm text-gray-500">Moyenne mensuelle</div>
            <div class="text-xl font-semibold mt-1">{timeStats.month.toFixed(1)} {unit}</div>
        </div>
    </div>

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

        <div class="h-[300px] relative">
            <canvas bind:this={canvas}></canvas>
        </div>
    </div>
</div>