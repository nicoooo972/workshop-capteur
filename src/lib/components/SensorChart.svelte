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
    export let metric: 'co2' | 'temperature' | 'humidity';
    export let chart: Chart;
    
    let canvas: HTMLCanvasElement;
    let displayData: typeof data;
    let isMobile = false;
    let showModal = false;
    let selectedPoint: any = null;

    // Limite uniquement pour mobile
    const MOBILE_POINT_LIMIT = 20;
    
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
            thresholds: [30, 70],
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

    function limitDataPoints(data: typeof displayData): typeof displayData {
        if (!isMobile) return data;
        if (data.length <= MOBILE_POINT_LIMIT) return data;
        const step = Math.ceil(data.length / MOBILE_POINT_LIMIT);
        return data.filter((_, index) => index % step === 0).slice(0, MOBILE_POINT_LIMIT);
    }

    function updateChart() {
        if (!canvas) return;
        if (chart) chart.destroy();
        
        const config = metricConfig[metric];
        let sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
        displayData = limitDataPoints(sortedData);

        const ctx = canvas.getContext('2d');
        
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

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: displayData.map(d => new Date(d.timestamp).toLocaleString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'numeric'
                })),
                datasets: [{
                    label: config.label,
                    data: displayData.map(d => d[metric]),
                    borderColor: config.color,
                    backgroundColor: config.fill,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
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
                                const status = getStatus(value, metric);
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
                        const value = displayData[index][metric];
                        const status = getStatus(value, metric);
                        selectedPoint = {
                            value,
                            timestamp: displayData[index].timestamp,
                            status,
                            recommendations: status !== 'normal' ? metricConfig[metric].recommendations[status] : null
                        };
                        showModal = true;
                    }
                }
            },
            plugins: [thresholdPlugin]
        });
    }

    function checkMobile() {
        if (typeof window !== 'undefined') {
            isMobile = window.innerWidth < 768;
        }
    }

    function closeModal() {
        showModal = false;
        setTimeout(() => {
            selectedPoint = null;
        }, 200);
    }

    // Mise à jour lors des changements de données ou de métrique
    $: {
        if (canvas && data && metric) {
            updateChart();
        }
    }

    function handleResize() {
        const wasMobile = isMobile;
        checkMobile();
        if (canvas && wasMobile !== isMobile) {
            updateChart();
        }
    }

    onMount(() => {
        checkMobile();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize);
        }
        
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

<div class="relative w-full" style="height: {isMobile ? '300px' : '400px'}">
    <canvas bind:this={canvas}></canvas>
</div>

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
                            {selectedPoint.value.toFixed(1)} {metricConfig[metric].label.split(' ')[1]}
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
                            Cette valeur est comprise entre {metricConfig[metric].thresholds[0]} et {metricConfig[metric].thresholds[1]} {metricConfig[metric].label.split(' ')[1]}
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