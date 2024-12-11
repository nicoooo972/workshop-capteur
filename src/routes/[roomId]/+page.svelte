<script lang="ts">
  import { onMount } from 'svelte';
  import { onValue, ref } from 'firebase/database';
  import { db } from '$lib/firebase';
  import { Dialog } from '$lib/components/ui/dialog';
  import Header from '../Header.svelte';
  import MetricCard from '$lib/components/MetricCard.svelte';
  import SensorChart from '$lib/components/SensorChart.svelte';
  import AlertSystem from '$lib/components/AlertSystem.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { jsPDF } from 'jspdf';
  import 'jspdf-autotable';
  import UnifiedAnalysis from '$lib/components/UnifiedAnalysis.svelte';

  import { sensors } from '$lib/stores/sensors';

  type SensorData = {
      co2: number;
      humidity: number;
      temperature: number;
      timestamp: number;
      title: string;
  };

  type Alert = {
      id: string;
      type: 'co2' | 'temperature' | 'humidity';
      value: number;
      threshold: [number, number];
      timestamp: number;
      location: string;
      severity: 'warning' | 'critical';
      isStale?: boolean;
  };

  // État local
  let roomData: SensorData[] = [];
  let selectedTimeRange = '24h';
  let selectedMetric = 'temperature';
  let showExportDialog = false;
  let exportFormat: 'csv' | 'pdf' | 'xml' = 'csv';
  let isLoading = true;
  let chart: any = null;
  let showAlerts = false;

  // Configuration
  const timeRanges = {
      '1h': { value: 60 * 60 * 1000, label: '1 heure', icon: '⚡' },
      '24h': { value: 24 * 60 * 60 * 1000, label: '24 heures', icon: '🕒' },
      '7d': { value: 7 * 24 * 60 * 60 * 1000, label: '7 jours', icon: '📅' },
      '30d': { value: 30 * 24 * 60 * 60 * 1000, label: '30 jours', icon: '📊' }
  };

  const metrics = [
      { id: 'temperature', label: 'Température', icon: '🌡️', unit: '°C' },
      { id: 'humidity', label: 'Humidité', icon: '💧', unit: '%' },
      { id: 'co2', label: 'CO2', icon: '📊', unit: 'ppm' }
  ];

  const thresholds = {
      co2: [400, 1000],        // ppm
      temperature: [18, 26],    // °C
      humidity: [40, 60]        // %
  };

  // Réactivité
  $: roomId = $page.params.roomId;
  
  $: filteredData = roomData
      .filter(entry => entry.timestamp > Date.now() - timeRanges[selectedTimeRange].value)
      .sort((a, b) => a.timestamp - b.timestamp);

  $: latestData = getLatestData(roomData);
  $: currentAlerts = latestData ? generateAlerts(latestData) : [];
  $: dataIsStale = latestData ? isDataStale(latestData.timestamp) : false;
  $: stats = calculateStats(filteredData, selectedMetric);
  $: roomData = $sensors.find(room => room.id === roomId)?.data || [];

  // Types
  // Fonctions utilitaires
  function getLatestData(data: SensorData[]): SensorData | null {
      if (!data.length) return null;
      return [...data].sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  function isDataStale(timestamp: number): boolean {
      return Date.now() - timestamp > 5 * 60 * 1000;
  }

  function formatDate(timestamp: number): string {
      return new Date(timestamp).toLocaleString('fr-FR', {
          dateStyle: 'short',
          timeStyle: 'short'
      });
  }

  function calculateStats(data: SensorData[], metric: string) {
      if (!data.length) return { min: 0, max: 0, avg: 0 };
      
      const values = data.map(d => d[metric]);
      return {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b) / values.length
      };
  }

  // Génération des alertes
  function generateAlerts(data: SensorData): Alert[] {
      const alerts: Alert[] = [];
      const isStale = isDataStale(data.timestamp);

      // Alerte CO2
      if (data.co2 < thresholds.co2[0] || data.co2 > thresholds.co2[1]) {
          alerts.push({
              id: `co2-${data.timestamp}`,
              type: 'co2',
              value: data.co2,
              threshold: thresholds.co2,
              timestamp: data.timestamp,
              location: data.title,
              severity: data.co2 > thresholds.co2[1] * 1.2 ? 'critical' : 'warning',
              isStale
          });
      }

      // Alerte température
      if (data.temperature < thresholds.temperature[0] || data.temperature > thresholds.temperature[1]) {
          alerts.push({
              id: `temp-${data.timestamp}`,
              type: 'temperature',
              value: data.temperature,
              threshold: thresholds.temperature,
              timestamp: data.timestamp,
              location: data.title,
              severity: Math.abs(data.temperature - thresholds.temperature[1]) > 5 ? 'critical' : 'warning',
              isStale
          });
      }

      // Alerte humidité
      if (data.humidity < thresholds.humidity[0] || data.humidity > thresholds.humidity[1]) {
          alerts.push({
              id: `humid-${data.timestamp}`,
              type: 'humidity',
              value: data.humidity,
              threshold: thresholds.humidity,
              timestamp: data.timestamp,
              location: data.title,
              severity: Math.abs(data.humidity - thresholds.humidity[1]) > 15 ? 'critical' : 'warning',
              isStale
          });
      }

      return alerts;
  }

  // Fonctions d'export
  async function handleExport() {
      try {
          switch (exportFormat) {
              case 'csv':
                  exportToCsv();
                  break;
              case 'pdf':
                  exportToPdf();
                  break;
              case 'xml':
                  exportToXml();
                  break;
          }
      } catch (error) {
          console.error('Erreur lors de l\'export:', error);
      }
      showExportDialog = false;
  }

  function exportToCsv() {
      const headers = ['Timestamp', 'CO2 (ppm)', 'Température (°C)', 'Humidité (%)', 'Statut'];
      const rows = filteredData.map(row => [
          formatDate(row.timestamp),
          row.co2.toFixed(1),
          row.temperature.toFixed(1),
          row.humidity.toFixed(1),
          generateAlerts(row).length > 0 ? 'Alerte' : 'Normal'
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      downloadFile(csvContent, 'text/csv', 'csv');
  }

  function exportToPdf() {
      const doc = new jsPDF();
      
      // En-tête
      doc.setFontSize(20);
      doc.text(`Rapport - ${latestData?.title}`, 20, 20);
      
      // Informations
      doc.setFontSize(12);
      doc.text(`Période : ${formatDate(filteredData[0].timestamp)} - ${formatDate(filteredData[filteredData.length - 1].timestamp)}`, 20, 30);
      
      // Tableau
      doc.autoTable({
          head: [['Métrique', 'Minimum', 'Maximum', 'Moyenne']],
          body: metrics.map(metric => [
              metric.label,
              stats.min.toFixed(1) + ' ' + metric.unit,
              stats.max.toFixed(1) + ' ' + metric.unit,
              stats.avg.toFixed(1) + ' ' + metric.unit
          ]),
          startY: 40
      });
      
      // Graphique
      if (chart?.canvas) {
          const imgData = chart.canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 20, 100, 170, 80);
      }
      
      doc.save(`${latestData?.title}_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  function exportToXml() {
      let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<mesures salle="${latestData?.title}">
${filteredData.map(row => `
  <mesure>
      <timestamp>${formatDate(row.timestamp)}</timestamp>
      <co2 unite="ppm">${row.co2.toFixed(1)}</co2>
      <temperature unite="celsius">${row.temperature.toFixed(1)}</temperature>
      <humidite unite="pourcent">${row.humidity.toFixed(1)}</humidite>
      <statut>${generateAlerts(row).length > 0 ? 'alerte' : 'normal'}</statut>
  </mesure>`).join('')}
</mesures>`;
      
      downloadFile(xmlContent, 'application/xml', 'xml');
  }

  function downloadFile(content: string, type: string, extension: string) {
      const blob = new Blob([content], { type: type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${latestData?.title}_${new Date().toISOString().slice(0,10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  }

  // Initialisation
  onMount(async () => {
    if (!roomId) return;

    const roomRef = ref(db, `dcCampus/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            roomData = Object.values(data)
                .sort((a: any, b: any) => b.timestamp - a.timestamp);
        }
        isLoading = false;
    });

    return () => unsubscribe();
});
</script>

<svelte:head>
  <title>{latestData ? latestData.title : 'Chargement...'} - Monitoring</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <Header 
      title={latestData?.title || 'Chargement...'}
      subtitle="Détails et analyses"
      showBack={true}
  />

  <main class="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto space-y-8">
          {#if isLoading}
              <div class="flex justify-center items-center min-h-[400px]">
                  <div class="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
              </div>
          {:else if !latestData}
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p class="text-yellow-700">Aucune donnée disponible pour cette salle.</p>
              </div>
          {:else}
              <!-- En-tête avec actions -->
              <div class="flex justify-between items-start">
                  <div class="space-y-1">
                      <div class="flex items-center gap-2">
                          <span class={`w-2 h-2 rounded-full ${dataIsStale ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                          <span class="text-sm text-gray-500">
                              Dernière mise à jour : {formatDate(latestData.timestamp)}
                          </span>
                      </div>
                  </div>
                  <button
                      class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                      on:click={() => showExportDialog = true}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                      </svg>
                      Exporter
                  </button>
              </div>

              <!-- Dialogue d'export -->
{#if showExportDialog}
<Dialog open={showExportDialog} onOpenChange={(open) => showExportDialog = open}>
    <div class="p-6">
        <h2 class="text-xl font-bold mb-4">Exporter les données</h2>
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Format d'export</label>
                <div class="grid grid-cols-3 gap-2">
                    {#each ['csv', 'pdf', 'xml'] as format}
                        <button
                            class="p-4 border rounded-lg text-center transition-colors duration-200 
                                {exportFormat === format 
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                                    : 'hover:bg-gray-50'}"
                            on:click={() => exportFormat = format}
                        >
                            {format.toUpperCase()}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-6">
                <button
                    class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    on:click={() => showExportDialog = false}
                >
                    Annuler
                </button>
                <button
                    class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    on:click={handleExport}
                >
                    Exporter
                </button>
            </div>
        </div>
    </div>
</Dialog>
{/if}


            <!-- Cartes de métriques -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                  title="CO2"
                  value={latestData.co2}
                  unit="ppm"
                  thresholds={thresholds.co2}
                  icon="📊"
              />
              
              <MetricCard
                  title="Température"
                  value={latestData.temperature}
                  unit="°C"
                  thresholds={thresholds.temperature}
                  icon="🌡️"
              />
              
              <MetricCard
                  title="Humidité"
                  value={latestData.humidity}
                  unit="%"
                  thresholds={thresholds.humidity}
                  icon="💧"
              />
          </div>

              <!-- Période d'analyse -->
              <div class="bg-white rounded-lg shadow-sm p-6 space-y-6">
                  <div class="space-y-3">
                      <h3 class="text-base font-medium text-gray-900">Période d'analyse</h3>
                      <div class="flex flex-wrap gap-3">
                          {#each Object.entries(timeRanges) as [key, range]}
                              <button
                                  class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
                                      {selectedTimeRange === key 
                                          ? 'bg-indigo-600 text-white shadow-md scale-105' 
                                          : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}"
                                  on:click={() => selectedTimeRange = key}
                              >
                                  <span class="text-lg">{range.icon}</span>
                                  <span>{range.label}</span>
                              </button>
                          {/each}
                      </div>
                  </div>

            </div>
            <!-- Analyse unifiée -->
            <div class="bg-white rounded-lg shadow-sm p-6">
                <UnifiedAnalysis data={filteredData} />
            </div>

            <!-- Système d'alertes -->
            {#if currentAlerts.length > 0}
                <div class="bg-white rounded-lg shadow-sm p-6">
                    <AlertSystem alerts={currentAlerts} />
                </div>
            {/if}
        {/if}
    </div>
</main>
</div>

<style>
:global(body) {
    @apply bg-gray-50;
    margin: 0;
    padding: 0;
    overflow-y: scroll !important;
}

:global(::-webkit-scrollbar) {
    width: 14px;
}

:global(::-webkit-scrollbar-track) {
    background-color: transparent;
}

:global(::-webkit-scrollbar-thumb) {
    background-color: #cbd5e1;
    border: 4px solid white;
    border-radius: 7px;
}

:global(::-webkit-scrollbar-thumb:hover) {
    background-color: #94a3b8;
}

:global(html) {
    overflow-y: scroll !important;
}
</style>
                      