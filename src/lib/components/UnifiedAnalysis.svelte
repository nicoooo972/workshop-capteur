<script lang="ts">
    import { onMount } from 'svelte';
    import { Chart } from 'chart.js/auto';
    
    export let data: any[] = [];
    
    export let thresholds = {
        temperature: { max: 25, min: 17 },
        humidity: { max: 60, min: 30 },
        co2: { max: 1000, min: 400 }
    };
    
    let selectedMetric: 'temperature' | 'humidity' | 'co2' = 'temperature';
    let selectedView = 'evolution';
    let chart: any;
    let canvas: HTMLCanvasElement;
    let chartContainer: HTMLDivElement;

    const metrics = [
        { id: 'temperature', label: '🌡️ Température', unit: '°C' },
        { id: 'humidity', label: '💧 Humidité', unit: '%' },
        { id: 'co2', label: '📊 CO2', unit: 'ppm' }
    ];

    function isMobile() {
        return window.innerWidth < 768;
    }

    function ensureTimestamp(date: number | string): number {
        if (typeof date === 'number') {
            return date;
        }
        
        if (typeof date === 'string') {
            console.log('Date string reçue:', date);
            
            if (date.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
                const [datePart, timePart] = date.split(' ');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hours, minutes, seconds] = timePart.split(':').map(Number);
                const timestamp = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
                return timestamp;
            }

            const timestamp = Date.parse(date);
            if (!isNaN(timestamp)) {
                return timestamp;
            }
        }
        
        return Date.now();
    }
    
    $: sortedData = [...data]
        .filter(item => item && item.timestamp)
        .map(item => ({
            ...item,
            originalTimestamp: item.timestamp,
            timestamp: ensureTimestamp(item.timestamp)
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

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
            if (bucketIndex >= 0) buckets[bucketIndex].count++;
        });

        return buckets;
    })();

    function getMetricUnit(metricId: string): string {
        return metrics.find(m => m.id === metricId)?.unit || '';
    }

    function formatDate(timestamp: number): string {
        if (isMobile()) {
            return new Date(timestamp).toLocaleString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return new Date(timestamp).toLocaleString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'numeric'
        });
    }

    function updateChartHeight() {
        if (chartContainer) {
            const containerWidth = chartContainer.offsetWidth;
            let height = isMobile() ? 250 : 400;
            chartContainer.style.height = `${height}px`;
            if (chart) {
                chart.resize();
            }
        }
    }

    function addThresholdAnnotations(chartOptions: any) {
    const threshold = thresholds[selectedMetric];
    
    if (threshold && selectedView === 'evolution') {
        chartOptions.plugins.annotation = {
            annotations: {
                maxLine: {
                    type: 'line',
                    yMin: threshold.max,
                    yMax: threshold.max,
                    borderColor: 'rgba(239, 68, 68, 0.8)', // Rouge plus vif
                    borderWidth: isMobile() ? 1.5 : 2,
                    borderDash: [6, 4], // Tirets plus courts pour plus de visibilité
                    label: {
                        content: isMobile() ? `Max ${threshold.max}` : `Seuil max: ${threshold.max}`,
                        enabled: true,
                        position: 'end',
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        color: 'white',
                        padding: {
                            x: 6,
                            y: 4
                        },
                        font: {
                            size: isMobile() ? 10 : 12,
                            weight: 'bold'
                        }
                    },
                    drawTime: 'beforeDatasetsDraw' // Pour s'assurer que la ligne est sous les données
                },
                minLine: {
                    type: 'line',
                    yMin: threshold.min,
                    yMax: threshold.min,
                    borderColor: 'rgba(59, 130, 246, 0.8)', // Bleu plus vif
                    borderWidth: isMobile() ? 1.5 : 2,
                    borderDash: [6, 4],
                    label: {
                        content: isMobile() ? `Min ${threshold.min}` : `Seuil min: ${threshold.min}`,
                        enabled: true,
                        position: 'end',
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                        color: 'white',
                        padding: {
                            x: 6,
                            y: 4
                        },
                        font: {
                            size: isMobile() ? 10 : 12,
                            weight: 'bold'
                        }
                    },
                    drawTime: 'beforeDatasetsDraw'
                }
            }
        };
    }
}
    function updateChart() {
        if (chart) {
            chart.destroy();
        }

        const unit = getMetricUnit(selectedMetric);
        let chartData;
        let chartOptions: any;

        switch (selectedView) {
            case 'evolution':
                // Réduire les points sur mobile
                const dataPoints = isMobile() ? 
                    sortedData.filter((_, index) => index % 3 === 0) : 
                    sortedData;

                chartData = {
                    labels: dataPoints.map(d => formatDate(d.timestamp)),
                    datasets: [{
                        label: metrics.find(m => m.id === selectedMetric)?.label,
                        data: dataPoints.map(d => d[selectedMetric]),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        pointRadius: isMobile() ? 2 : 3,
                        tension: 0.2 // Lissage léger de la courbe
                    }]
                };

                chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context: any) => {
                                    const value = context.raw;
                                    const threshold = thresholds[selectedMetric];
                                    let status = '';
                                    
                                    if (value > threshold.max) {
                                        status = '❌';
                                    } else if (value < threshold.min) {
                                        status = '⚠️';
                                    } else {
                                        status = '✅';
                                    }
                                    
                                    return `${status} ${value} ${unit}`;
                                }
                            },
                            titleFont: {
                                size: isMobile() ? 10 : 12
                            },
                            bodyFont: {
                                size: isMobile() ? 10 : 12
                            },
                            padding: isMobile() ? 6 : 10
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                maxRotation: isMobile() ? 0 : 45,
                                minRotation: 0,
                                autoSkip: true,
                                maxTicksLimit: isMobile() ? 6 : 12,
                                font: {
                                    size: isMobile() ? 8 : 12
                                }
                            },
                            grid: {
                                display: !isMobile()
                            }
                        },
                        y: {
                            title: {
                                display: !isMobile(),
                                text: unit
                            },
                            ticks: {
                                font: {
                                    size: isMobile() ? 8 : 12
                                }
                            },
                            grid: {
                                display: !isMobile()
                            }
                        }
                    }
                };
                addThresholdAnnotations(chartOptions);
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
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context: any) => `${context.raw.toFixed(1)} ${unit}`
                            },
                            titleFont: {
                                size: isMobile() ? 10 : 12
                            },
                            bodyFont: {
                                size: isMobile() ? 10 : 12
                            },
                            padding: isMobile() ? 6 : 10
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                font: {
                                    size: isMobile() ? 8 : 12
                                }
                            },
                            grid: {
                                display: !isMobile()
                            }
                        },
                        y: {
                            title: {
                                display: !isMobile(),
                                text: unit
                            },
                            ticks: {
                                font: {
                                    size: isMobile() ? 8 : 12
                                }
                            },
                            grid: {
                                display: !isMobile()
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
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            titleFont: {
                                size: isMobile() ? 10 : 12
                            },
                            bodyFont: {
                                size: isMobile() ? 10 : 12
                            },
                            padding: isMobile() ? 6 : 10
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                maxRotation: isMobile() ? 45 : 0,
                                font: {
                                    size: isMobile() ? 8 : 12
                                }
                            },
                            grid: {
                                display: !isMobile()
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: !isMobile(),
                                text: 'Nombre de mesures'
                            },
                            ticks: {
                                font: {
                                    size: isMobile() ? 8 : 12
                                }
                            },
                            grid: {
                                display: !isMobile()
                            }
                        }
                    }
                };
                break;
        }

        const ctx = canvas.getContext('2d');
        chart = new Chart(ctx, {
            type: selectedView === 'evolution' ? 'line' : 'bar',
            data: chartData,
            options: chartOptions
        });
    }

    // Gestion du responsive
    let resizeObserver: ResizeObserver;
    let resizeTimeout: NodeJS.Timeout;

    function handleResize() {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
            updateChartHeight();
            updateChart();
        }, 250);
    }

    onMount(() => {
        if (canvas && sortedData.length > 0) {
            updateChart();
        }

        // Observer les changements de taille
        resizeObserver = new ResizeObserver(handleResize);
        if (chartContainer) {
            resizeObserver.observe(chartContainer);
        }

        // Listener pour les changements d'orientation sur mobile
        window.addEventListener('orientationchange', handleResize);

        return () => {
            if (chart) {
                chart.destroy();
            }
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            window.removeEventListener('orientationchange', handleResize);
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
        };
    });

    $: {
        if (canvas && sortedData.length > 0) {
            updateChart();
        }
    }
</script>

<div class="bg-white rounded-lg shadow-sm">
    <!-- En-tête avec titre et notification -->
    <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Mesures {selectedMetric}</h2>
            <div class="flex items-center gap-2">
                {#if timeStats[selectedMetric] > thresholds[selectedMetric].max}
                    <span class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Seuil dépassé
                    </span>
                {/if}
            </div>
        </div>
    </div>

    <!-- Sélection de la métrique -->
    <div class="border-b border-gray-200">
        <nav class="-mb-px flex flex-wrap" aria-label="Tabs">
            {#each metrics as m}
                <button
                    class="flex-1 min-w-[100px] whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs md:text-sm text-center
                        {selectedMetric === m.id
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                    on:click={() => {
                        selectedMetric = m.id;
                        updateChart();
                    }}
                >
                    <span class="inline-flex items-center">
                        {m.label}
                        {#if m.id === selectedMetric && timeStats[m.id] > thresholds[m.id].max}
                            <span class="ml-2 w-2 h-2 rounded-full bg-red-500"></span>
                        {/if}
                    </span>
                </button>
            {/each}
        </nav>
    </div>

    <!-- Stats en format mobile-first -->
    <div class="p-2 md:p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            <div class="bg-gray-50 p-2 md:p-3 rounded-lg text-center md:text-left">
                <div class="text-xs md:text-sm text-gray-500">Jour</div>
                <div class="text-base md:text-xl font-semibold">
                    {timeStats.day.toFixed(1)} {getMetricUnit(selectedMetric)}
                </div>
            </div>
            <div class="bg-gray-50 p-2 md:p-3 rounded-lg text-center md:text-left">
                <div class="text-xs md:text-sm text-gray-500">Semaine</div>
                <div class="text-base md:text-xl font-semibold">
                    {timeStats.week.toFixed(1)} {getMetricUnit(selectedMetric)}
                </div>
            </div>
            <div class="bg-gray-50 p-2 md:p-3 rounded-lg text-center md:text-left">
                <div class="text-xs md:text-sm text-gray-500">Mois</div>
                <div class="text-base md:text-xl font-semibold">
                    {timeStats.month.toFixed(1)} {getMetricUnit(selectedMetric)}
                </div>
            </div>
        </div>
    </div>

    <!-- Vue sélection en scrollable sur mobile -->
    <div class="border-b border-gray-200 overflow-x-auto">
        <nav class="-mb-px flex space-x-4 md:space-x-8 px-2 md:px-4 min-w-max" aria-label="Tabs">
            {#each [
                { id: 'evolution', label: 'Évolution' },
                { id: 'hourly', label: 'Par heure' },
                { id: 'distribution', label: 'Distribution' }
            ] as view}
                <button
                    class="whitespace-nowrap py-3 px-2 border-b-2 font-medium text-xs md:text-sm
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

    <!-- Zone du graphique optimisée -->
    <div class="p-2 md:p-4">
        <div class="space-y-2">
            <!-- Description du graphique -->
            <p class="text-xs md:text-sm text-gray-500">
                {#if selectedView === 'evolution'}
                    Évolution au fil du temps
                {:else if selectedView === 'hourly'}
                    Moyennes par heure
                {:else}
                    Distribution des valeurs
                {/if}
            </p>

            <!-- Conteneur du graphique -->
            <div bind:this={chartContainer} 
                 class="relative w-full bg-white rounded-lg border border-gray-100">
                <canvas bind:this={canvas}></canvas>
            </div>

            <!-- Légende des seuils en version mobile-friendly -->
            {#if selectedView === 'evolution'}
                <div class="mt-2 md:mt-4 flex flex-col md:flex-row justify-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                    <div class="flex items-center justify-center">
                        <span class="inline-block w-3 md:w-4 h-0.5 bg-red-400 mr-1 md:mr-2"></span>
                        <span>Max: {thresholds[selectedMetric].max}{getMetricUnit(selectedMetric)}</span>
                    </div>
                    <div class="flex items-center justify-center">
                        <span class="inline-block w-3 md:w-4 h-0.5 bg-blue-400 mr-1 md:mr-2"></span>
                        <span>Min: {thresholds[selectedMetric].min}{getMetricUnit(selectedMetric)}</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>