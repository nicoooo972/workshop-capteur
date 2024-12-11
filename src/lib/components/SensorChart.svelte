<script lang="ts">
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';
    import { fade, fly } from 'svelte/transition';
    
    export let data: Array<{
        timestamp: number;
        co2: number;
        temperature: number;
        humidity: number;
    }>;
    
    let selectedMetric: 'temperature' | 'humidity' | 'co2' = 'temperature';
    let selectedView = 'evolution';
    let chart: Chart;
    let canvas: HTMLCanvasElement;
    let isMobile = false;
    let showModal = false;
    let selectedPoint: any = null;

    const MOBILE_POINT_LIMIT = 20;

    const metrics = [
        { id: 'temperature', label: '🌡️ Température', unit: '°C' },
        { id: 'humidity', label: '💧 Humidité', unit: '%' },
        { id: 'co2', label: '📊 CO2', unit: 'ppm' }
    ];

    const metricConfig = {
        co2: {
            label: 'CO2 (ppm)',
            color: 'rgb(239, 68, 68)',
            fill: 'rgba(239, 68, 68, 0.1)',
            thresholds: [400, 1000],
            recommendations: {
                high: [
                    "Aérer la pièce pendant 10-15 minutes",
                    "Vérifier le système de ventilation",
                    "Réduire le nombre de personnes dans la pièce",
                    "Installer un système de ventilation mécanique si récurrent"
                ],
                low: [
                    "Vérifier l'étalonnage du capteur",
                    "S'assurer que la pièce n'est pas sur-ventilée",
                    "Vérifier que les entrées d'air ne sont pas obstruées"
                ]
            }
        },
        temperature: {
            label: 'Température (°C)',
            color: 'rgb(59, 130, 246)',
            fill: 'rgba(59, 130, 246, 0.1)',
            thresholds: [18, 26],
            recommendations: {
                high: [
                    "Activer la climatisation",
                    "Fermer les stores ou rideaux",
                    "Éteindre les appareils non essentiels",
                    "Ventiler la pièce tôt le matin ou tard le soir"
                ],
                low: [
                    "Augmenter le chauffage",
                    "Vérifier l'isolation des fenêtres",
                    "Fermer les portes pour éviter les pertes de chaleur",
                    "Utiliser un chauffage d'appoint si nécessaire"
                ]
            }
        },
        humidity: {
            label: 'Humidité (%)',
            color: 'rgb(16, 185, 129)',
            fill: 'rgba(16, 185, 129, 0.1)',
            thresholds: [40, 60],
            recommendations: {
                high: [
                    "Activer le déshumidificateur",
                    "Améliorer la ventilation",
                    "Vérifier les sources potentielles d'humidité",
                    "Réparer les fuites éventuelles"
                ],
                low: [
                    "Utiliser un humidificateur",
                    "Ajouter des plantes d'intérieur",
                    "Éviter la sur-ventilation",
                    "Placer des récipients d'eau près des sources de chaleur"
                ]
            }
        }
    };
    
    // Tri chronologique des données
    $: sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    // Surveiller les changements de métrique et de vue
    $: {
        selectedMetric;
        selectedView;
        if (chart) {
            updateChart();
        }
    }

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

    function getStatus(value: number, metricType: string) {
        const thresholds = metricConfig[metricType].thresholds;
        if (value > thresholds[1]) return 'high';
        if (value < thresholds[0]) return 'low';
        return 'normal';
    }

    function getStatusIcon(status: string) {
        switch(status) {
            case 'high': return '🔴';
            case 'low': return '🔵';
            default: return '✅';
        }
    }

    function getStatusText(status: string) {
        switch(status) {
            case 'high': return 'Valeur trop élevée';
            case 'low': return 'Valeur trop basse';
            default: return 'Valeur normale';
        }
    }

    function limitDataPoints(data: typeof sortedData): typeof sortedData {
        if (!isMobile) return data;
        if (data.length <= MOBILE_POINT_LIMIT) return data;
        const step = Math.ceil(data.length / MOBILE_POINT_LIMIT);
        return data.filter((_, index) => index % step === 0).slice(0, MOBILE_POINT_LIMIT);
    }

    function updateChart() {
        if (chart) {
            chart.destroy();
        }

        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const config = metricConfig[selectedMetric];
        const displayData = limitDataPoints(sortedData);

        let chartData;
        let chartOptions;

        switch (selectedView) {
            case 'evolution':
                // Plugin personnalisé pour les seuils
                const thresholdPlugin = {
                    id: 'thresholds',
                    beforeDraw: (chart) => {
                        const ctx = chart.ctx;
                        const yAxis = chart.scales.y;
                        const thresholds = config.thresholds;
                        
                        ctx.save();
                        ctx.beginPath();
                        ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)';
                        ctx.setLineDash([5, 5]);
                        
                        thresholds.forEach(threshold => {
                            const y = yAxis.getPixelForValue(threshold);
                            ctx.moveTo(chart.chartArea.left, y);
                            ctx.lineTo(chart.chartArea.right, y);
                        });
                        
                        ctx.stroke();
                        ctx.restore();
                    }
                };

                chartData = {
                    labels: displayData.map(d => new Date(d.timestamp).toLocaleString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'numeric'
                    })),
                    datasets: [{
                        label: config.label,
                        data: displayData.map(d => d[selectedMetric]),
                        borderColor: config.color,
                        backgroundColor: config.fill,
                        tension: 0.3,
                        fill: true
                    }]
                };

                chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: (context) => {
                                    const value = context.raw as number;
                                    const status = getStatus(value, selectedMetric);
                                    let label = `${config.label}: ${value}`;
                                    
                                    if (status === 'high') {
                                        label += ' ⚠️ Valeur trop élevée';
                                    } else if (status === 'low') {
                                        label += ' ⚠️ Valeur trop basse';
                                    } else {
                                        label += ' ✅ Valeur normale';
                                    }
                                    
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45,
                                font: {
                                    size: isMobile ? 10 : 12
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                font: {
                                    size: isMobile ? 10 : 12
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    },
                    onClick: (event, elements) => {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const value = displayData[index][selectedMetric];
                            const status = getStatus(value, selectedMetric);
                            selectedPoint = {
                                value,
                                timestamp: displayData[index].timestamp,
                                status,
                                recommendations: status !== 'normal' ? metricConfig[selectedMetric].recommendations[status] : null
                            };
                            showModal = true;
                        }
                    }
                };

                chart = new Chart(ctx, {
                    type: 'line',
                    data: chartData,
                    options: chartOptions,
                    plugins: [thresholdPlugin]
                });
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
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: getMetricUnit(selectedMetric)
                            }
                        }
                    }
                };
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: chartData,
                    options: chartOptions
                });
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
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: chartData,
                    options: chartOptions
                });
                break;
        }
    }

    function closeModal() {
        showModal = false;
        setTimeout(() => {
            selectedPoint = null;
        }, 200);
    }

    function checkMobile() {
        if (typeof window !== 'undefined') {
            isMobile = window.innerWidth < 768;
        }
    }

    function handleResize() {
        const wasMobile = isMobile;
        checkMobile();
        if (wasMobile !== isMobile) {
            updateChart();
        }
    }

    onMount(() => {
        checkMobile();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize);
        }
        updateChart(); // Initial chart creation
        
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handleResize);
            }
            if (chart) {
                chart.destroy();
            }
        };
    });
</script>

<div class="space-y-4">
    <!-- Sélection des métriques -->
    <div class="flex gap-2">
        {#each metrics as metric}
            <button
                class="px-4 py-2 rounded-lg transition-colors {selectedMetric === metric.id ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}"
                on:click={() => selectedMetric = metric.id}
            >
                {metric.label}
            </button>
        {/each}
    </div>

    <!-- Sélection des vues -->
    <div class="flex gap-2">
        {#each ['evolution', 'hourly', 'distribution'] as view}
            <button
                class="px-4 py-2 rounded-lg transition-colors {selectedView === view ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}"
                on:click={() => selectedView = view}
            >
                {view}
            </button>
        {/each}
    </div>

    <!-- Graphique -->
    <div class="relative w-full" style="height: {isMobile ? '300px' : '400px'}">
        <canvas bind:this={canvas}></canvas>
    </div>

    <!-- Statistiques -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-lg shadow">
            <h3 class="text-sm text-gray-500">Moyenne journalière</h3>
            <p class="text-2xl font-semibold">{timeStats.day.toFixed(1)} {getMetricUnit(selectedMetric)}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow">
            <h3 class="text-sm text-gray-500">Moyenne hebdomadaire</h3>
            <p class="text-2xl font-semibold">{timeStats.week.toFixed(1)} {getMetricUnit(selectedMetric)}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow">
            <h3 class="text-sm text-gray-500">Moyenne mensuelle</h3>
            <p class="text-2xl font-semibold">{timeStats.month.toFixed(1)} {getMetricUnit(selectedMetric)}</p>
        </div>
    </div>
</div>

<!-- Modal -->
{#if showModal && selectedPoint}
    <div 
        class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        on:click|self={closeModal}
        transition:fade
    >
        <div 
            class="bg-white rounded-xl shadow-2xl w-full max-w-lg transform"
            role="dialog"
            aria-modal="true"
            transition:fly={{ y: 20, duration: 200 }}
        >
            <!-- En-tête -->
            <div class="flex items-center justify-between p-6 border-b">
                <h2 class="text-xl font-semibold text-gray-900">
                    Détails de la mesure
                </h2>
                <button 
                    class="text-gray-400 hover:text-gray-500 focus:outline-none"
                    on:click={closeModal}
                >
                    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Contenu -->
            <div class="p-6 space-y-6">
                <!-- Informations principales -->
                <div class="grid grid-cols-2 gap-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="text-sm text-gray-500">Date et heure</div>
                        <div class="mt-1 font-semibold">
                            {new Date(selectedPoint.timestamp).toLocaleString('fr-FR')}
                        </div>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <div class="text-sm text-gray-500">Mesure</div>
                        <div class="mt-1 font-semibold">
                            {selectedPoint.value.toFixed(1)} {getMetricUnit(selectedMetric)}
                        </div>
                    </div>
                </div>

                <!-- Statut et recommandations -->
                <div class={`p-6 rounded-xl ${
                    selectedPoint.status === 'normal' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-orange-50 border border-orange-200'
                }`}>
                    <div class="flex items-center gap-3 mb-4">
                        <span class="text-2xl">{getStatusIcon(selectedPoint.status)}</span>
                        <span class={`font-medium ${
                            selectedPoint.status === 'normal' 
                                ? 'text-green-800' 
                                : 'text-orange-800'
                        }`}>
                            {getStatusText(selectedPoint.status)}
                        </span>
                    </div>

                    {#if selectedPoint.status !== 'normal'}
                        <div class="space-y-4">
                            <h3 class="font-medium text-orange-800">Recommandations :</h3>
                            <ul class="space-y-3">
                                {#each selectedPoint.recommendations as recommendation}
                                    <li class="flex items-start gap-3 text-orange-700">
                                        <span class="text-lg">•</span>
                                        <span>{recommendation}</span>
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {:else}
                        <p class="text-green-700">
                            Cette valeur est comprise entre {metricConfig[selectedMetric].thresholds[0]} et {metricConfig[selectedMetric].thresholds[1]} {getMetricUnit(selectedMetric)}
                        </p>
                    {/if}
                </div>
            </div>

            <!-- Pied de modal -->
            <div class="p-6 border-t bg-gray-50 rounded-b-xl">
                <button
                    class="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    on:click={closeModal}
                >
                    Fermer
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    div {
        -webkit-tap-highlight-color: transparent;
    }
</style>