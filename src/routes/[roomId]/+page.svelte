<script lang="ts">
    import { onMount } from 'svelte';
    import { onValue, ref, push, set, get } from 'firebase/database';
    import { db } from '$lib/firebase';
    import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "$lib/components/ui/dialog";
    import Header from '../Header.svelte';
    import MetricCard from '$lib/components/MetricCard.svelte';
    import { jsPDF } from 'jspdf';
    import 'jspdf-autotable';
    import UnifiedAnalysis from '$lib/components/UnifiedAnalysis.svelte';
    import type { PageData } from './$types';
    import RecommendationsAlert from '$lib/components/RecommendationsAlert.svelte';
	import { Tooltip, TooltipTrigger, TooltipContent } from '$lib/components/ui/tooltip';

  
    // Interfaces
    interface SensorData {
      co2: number;
      humidity: number;
      temperature: number;
      date: string | number;
      title: string;
      timestamp?: number;
    }
  
    interface CarbonImpactData {
      name: string;
      roomId: string;
      result: number;
      timestamp: number;
    }
  
    interface AutomaticReport {
      id?: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string;
      recipients: string[];
      roomIds: string[];
      metrics: string[];
      enabled: boolean;
      day?: number;
    }
  
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
    let showCarbonDialog = false;
    let showReportDialog = false;
    let exportFormat: 'csv' | 'pdf' | 'xml' = 'csv';
    let isLoading = true;
    let chart: any = null;
    let showAlerts = false;
    let carbonResult: number | null = null;
    let hasExistingReport = false;
    let isCalculating = false;
    export let data: PageData;
    let newEmail = '';
    let editingReport: Partial<AutomaticReport> = {
      frequency: 'daily',
      time: '08:00',
      recipients: [],
      roomIds: [],
      metrics: [],
      enabled: true
    };
  
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
  
    const frequencies = [
      { id: 'daily', label: 'Quotidien' },
      { id: 'weekly', label: 'Hebdomadaire' },
      { id: 'monthly', label: 'Mensuel' }
    ];
  
    const thresholds = {
      co2: [400, 1000],        // ppm
      temperature: [18, 26],    // °C
      humidity: [40, 60]        // %
    };
  
    // Réactivité
    $: roomId = data.roomId;
    $: formattedRoomId = roomId ? roomId : '';
    $: filteredData = roomData
      .filter(entry => entry.timestamp > Date.now() - timeRanges[selectedTimeRange].value)
      .sort((a, b) => a.timestamp - b.timestamp);
    $: latestData = getLatestData(roomData);
    $: currentAlerts = latestData ? generateAlerts(latestData) : [];
    $: dataIsStale = latestData ? isDataStale(latestData.timestamp) : false;
    $: stats = calculateStats(filteredData, selectedMetric);
  
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
  
    // Fonctions pour l'impact carbone
    function calculateCarbonImpact(co2Data: number[]): number {
      const avgCO2 = co2Data.reduce((a, b) => a + b, 0) / co2Data.length;
      const excessCO2 = Math.max(0, avgCO2 - 400);
      return excessCO2 * 0.1;
    }
  
    async function saveCarbonImpact(data: CarbonImpactData) {
      const carbonImpactRef = ref(db, `carbonImpact/${data.roomId}`);
      await push(carbonImpactRef, data);
    }
  
    async function calculateAndSaveCarbonImpact() {
      if (isCalculating) return;
      isCalculating = true;
      
      try {
        const co2Data = filteredData.map(d => d.co2);
        carbonResult = calculateCarbonImpact(co2Data);
        
        await saveCarbonImpact({
          name: latestData?.title || 'Salle inconnue',
          roomId,
          result: carbonResult,
          timestamp: Date.now()
        });
        
        showNotification('Calcul effectué avec succès');
      } catch (error) {
        console.error('Erreur lors du calcul:', error);
        showNotification('Erreur lors du calcul', 'error');
      } finally {
        isCalculating = false;
      }
    }
  
    // Fonctions pour les rapports automatiques
    async function checkExistingReport() {
      const reportsRef = ref(db, `automaticReports/${roomId}`);
      const snapshot = await get(reportsRef);
      hasExistingReport = snapshot.exists();
      if (hasExistingReport) {
        const reportData = snapshot.val();
        editingReport = Object.values(reportData)[0] as AutomaticReport;
      }
    }
  
    function addEmail() {
      if (newEmail && newEmail.includes('@')) {
        editingReport.recipients = [...(editingReport.recipients || []), newEmail];
        newEmail = '';
      }
    }
  
    function removeEmail(email: string) {
      editingReport.recipients = editingReport.recipients?.filter(e => e !== email);
    }
  
    async function saveReport() {
      try {
        const reportsRef = ref(db, `automaticReports/${roomId}`);
        if (editingReport.id) {
          await set(ref(db, `automaticReports/${roomId}/${editingReport.id}`), editingReport);
        } else {
          await push(reportsRef, editingReport);
        }
        showNotification('Rapport automatique configuré avec succès');
        showReportDialog = false;
        await checkExistingReport();
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du rapport:', error);
        showNotification('Erreur lors de la configuration du rapport', 'error');
      }
    }
  
    // Génération des alertes
    function generateAlerts(data: SensorData): Alert[] {
      const alerts: Alert[] = [];
      const isStale = isDataStale(data.timestamp);
  
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
      
      doc.setFontSize(20);
      doc.text(`Rapport - ${latestData?.title}`, 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Période : ${formatDate(filteredData[0].timestamp)} - ${formatDate(filteredData[filteredData.length - 1].timestamp)}`, 20, 30);
      
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
  
    function showNotification(message: string, type: 'success' | 'error' = 'success') {
      alert(message);
    }
  
    // Initialisation
    onMount(async () => {
        if (!data.roomId) return;
        
        console.log('Room ID:', data.roomId);
        const roomRef = ref(db, `dcCampus/${data.roomId}`);
        
        const unsubscribe = onValue(roomRef, (snapshot) => {
            const firebaseData = snapshot.val();
            console.log('Données brutes Firebase:', firebaseData);

            if (firebaseData) {
                // Convertir l'objet en tableau et formater les données
                roomData = Object.entries(firebaseData)
                    .filter(([key, value]: [string, any]) => {
                        // Filtrer les entrées valides
                        return value && value.co2 && value.temperature && value.humidity && value.date;
                    })
                    .map(([key, value]: [string, any]) => ({
                        co2: Number(value.co2),
                        temperature: Number(value.temperature),
                        humidity: Number(value.humidity),
                        date: value.date,
                        timestamp: typeof value.date === 'string' 
                            ? new Date(value.date).getTime()
                            : value.date,
                        title: value.title || `Salle ${data.roomId}`
                    }));

                console.log('Données formatées:', roomData);
            }
            
            isLoading = false;
        }, (error) => {
            console.error('Erreur Firebase:', error);
            isLoading = false;
        });

        // Vérifier l'existence d'un rapport automatique
        await checkExistingReport();

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
            {:else if !roomData.length}
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <p class="text-yellow-700">Aucune donnée disponible pour cette salle.</p>
                </div>
            {:else}
                <!-- En-tête avec actions -->
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
    <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <button
            class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 w-full sm:w-auto"
            on:click={() => showCarbonDialog = true}
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3.293 3.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            <span class="hidden sm:inline">Impact</span> Carbone
        </button>

        <button
            class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 w-full sm:w-auto"
            on:click={() => showReportDialog = true}
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
            </svg>
            <span class="hidden sm:inline">{hasExistingReport ? 'Modifier' : 'Automatiser'}</span>
            <span class="sm:hidden">Rapport</span>
        </button>

        <button
            class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 w-full sm:w-auto"
            on:click={() => showExportDialog = true}
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
            </svg>
            <span class="hidden sm:inline">Exporter le</span> Bilan
        </button>
    </div>
</div>
                <!-- Cartes de métriques -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="space-y-4">
                        <MetricCard
                            title="CO2"
                            value={latestData.co2}
                            unit="ppm"
                            thresholds={thresholds.co2}
                            icon="📊"
                        />
                    </div>
                    
                    <div class="space-y-4">
                        <MetricCard
                            title="Température"
                            value={latestData.temperature}
                            unit="°C"
                            thresholds={thresholds.temperature}
                            icon="🌡️"
                        />
                    </div>
                    
                    <div class="space-y-4">
                        <MetricCard
                            title="Humidité"
                            value={latestData.humidity}
                            unit="%"
                            thresholds={thresholds.humidity}
                            icon="💧"
                        />
                    </div>
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

                <!-- Dialogues -->

                {#if showExportDialog}
                <Dialog open={showExportDialog} onOpenChange={(open) => showExportDialog = open}>
                    <DialogContent class="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Exporter les données</DialogTitle>
                            <DialogDescription>
                                Choisissez le format d'export de vos données
                            </DialogDescription>
                        </DialogHeader>
                
                        <div class="grid gap-4 py-4">
                            <div class="grid grid-cols-3 gap-2">
                                {#each ['csv', 'pdf', 'xml'] as format}
                                    <button
                                        class="p-4 border rounded-lg text-center transition-colors 
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
                
                        <DialogFooter>
                            <button
                                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                on:click={() => showExportDialog = false}
                            >
                                Annuler
                            </button>
                            <button
                                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                on:click={handleExport}
                            >
                                Exporter    
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/if}
                
                {#if showCarbonDialog}
                <Dialog open={showCarbonDialog} onOpenChange={(open) => showCarbonDialog = open}>
                    <DialogContent class="sm:max-w-2xl">
                        <DialogHeader>
                            <div class="flex items-center gap-2">
                                <DialogTitle>Impact Carbone</DialogTitle>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button class="text-gray-400 hover:text-gray-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                                </svg>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent class="max-w-xs p-4 bg-white border rounded-lg shadow-lg">
                                            <div class="space-y-2">
                                                <p class="font-medium">Méthode de calcul :</p>
                                                <ol class="text-sm space-y-1 text-gray-600">
                                                    <li>1. Calcul de la moyenne de CO2 sur la période</li>
                                                    <li>2. Soustraction du niveau de référence (400 ppm)</li>
                                                    <li>3. Conversion : 1 ppm au-dessus de 400 = 0.1 kg CO2/jour</li>
                                                    <li>4. Le résultat représente le surplus d'émissions dû à une ventilation insuffisante</li>
                                                </ol>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                            </div>
                            <DialogDescription>
                                Calculez l'impact carbone basé sur les mesures de CO2
                            </DialogDescription>
                        </DialogHeader>
                
                        <div class="space-y-4 py-4">
                            <div class="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                                <p class="text-gray-600">
                                    Le calcul de l'impact carbone est basé sur les mesures de CO2 de votre salle. 
                                    Un niveau de CO2 élevé indique une mauvaise ventilation et potentiellement 
                                    une consommation d'énergie excessive pour la climatisation.
                                </p>
                            </div>
                            
                            {#if !carbonResult}
                                <div class="space-y-4">
                                    <div class="bg-white border rounded-lg p-4">
                                        <h3 class="font-medium mb-2">Comment est calculé l'impact carbone ?</h3>
                                        <ul class="space-y-2 text-sm text-gray-600">
                                            <li>• Mesure du CO2 moyen sur la période sélectionnée</li>
                                            <li>• Calcul de l'excès par rapport au niveau de référence (400 ppm)</li>
                                            <li>• Conversion en équivalent CO2 selon les standards internationaux</li>
                                            <li>• Estimation de l'impact énergétique associé</li>
                                        </ul>
                                    </div>
                
                                    <button
                                        class="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                                               transition-colors flex items-center justify-center gap-2"
                                        on:click={calculateAndSaveCarbonImpact}
                                        disabled={isCalculating}
                                    >
                                        {#if isCalculating}
                                            <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Calcul en cours...
                                        {:else}
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                                            </svg>
                                            Calculer l'impact
                                        {/if}
                                    </button>
                                </div>
                            {:else}
                                <div class="space-y-4">
                                    <div class="bg-green-50 border border-green-100 rounded-lg p-4">
                                        <h3 class="font-medium text-green-800 mb-2">Résultat du calcul</h3>
                                        <p class="text-3xl font-bold text-green-600">{carbonResult.toFixed(2)} kg CO2/jour</p>
                                        <div class="mt-2 space-y-2">
                                            <p class="text-sm text-green-700">
                                                Impact annuel estimé : {(carbonResult * 365).toFixed(2)} kg CO2/an
                                            </p>
                                            <p class="text-sm text-gray-600">
                                                Ce calcul est basé sur vos niveaux moyens de CO2 et représente 
                                                l'impact potentiel de votre consommation énergétique.
                                            </p>
                                        </div>
                                    </div>
                
                                    <div class="bg-white border rounded-lg p-4">
                                        <h3 class="font-medium mb-2">Recommandations</h3>
                                        <ul class="space-y-2 text-sm text-gray-600">
                                            <li class="flex items-start gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                                </svg>
                                                <span>Optimisez la ventilation aux heures de pointe</span>
                                            </li>
                                            <li class="flex items-start gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                                </svg>
                                                <span>Vérifiez et entretenez régulièrement les systèmes de ventilation</span>
                                            </li>
                                            <li class="flex items-start gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                                </svg>
                                                <span>Ajustez la climatisation en fonction de l'occupation</span>
                                            </li>
                                        </ul>
                                    </div>
                                    
                                    <button
                                        class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                                               transition-colors flex items-center justify-center gap-2"
                                        on:click={exportToPdf}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd" />
                                        </svg>
                                        Exporter en PDF
                                    </button>
                                </div>
                            {/if}
                        </div>
                
                        <DialogFooter>
                            <button
                                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                on:click={() => showCarbonDialog = false}
                            >
                                Fermer
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/if}
                
                {#if showReportDialog}
                <Dialog open={showReportDialog} onOpenChange={(open) => showReportDialog = open}>
                    <DialogContent class="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>
                                {hasExistingReport ? 'Modifier le rapport automatique' : 'Configurer un rapport automatique'}
                            </DialogTitle>
                            <DialogDescription>
                                Configurez l'envoi automatique des rapports par email
                            </DialogDescription>
                        </DialogHeader>
                
                        <div class="grid gap-6 py-4">
                            <!-- Fréquence -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium">Fréquence d'envoi</label>
                                <div class="grid grid-cols-3 gap-2">
                                    {#each frequencies as freq}
                                        <button
                                            class="p-3 border rounded-lg text-center transition-colors
                                                {editingReport.frequency === freq.id 
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                                                    : 'hover:bg-gray-50'}"
                                            on:click={() => editingReport.frequency = freq.id}
                                        >
                                            {freq.label}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                
                            <!-- Heure d'envoi -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium">Heure d'envoi</label>
                                <input
                                    type="time"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                           focus:ring-indigo-500 focus:border-indigo-500"
                                    bind:value={editingReport.time}
                                />
                            </div>
                
                            <!-- Jour (si hebdomadaire ou mensuel) -->
                            {#if editingReport.frequency === 'weekly'}
                                <div class="space-y-2">
                                    <label class="text-sm font-medium">Jour de la semaine</label>
                                    <select
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                               focus:ring-indigo-500 focus:border-indigo-500"
                                        bind:value={editingReport.day}
                                    >
                                        {#each ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as day, i}
                                            <option value={i}>{day}</option>
                                        {/each}
                                    </select>
                                </div>
                            {:else if editingReport.frequency === 'monthly'}
                                <div class="space-y-2">
                                    <label class="text-sm font-medium">Jour du mois</label>
                                    <select
                                        class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                               focus:ring-indigo-500 focus:border-indigo-500"
                                        bind:value={editingReport.day}
                                    >
                                        {#each Array(31).fill(0).map((_, i) => i + 1) as day}
                                            <option value={day}>{day}</option>
                                        {/each}
                                    </select>
                                </div>
                            {/if}
                
                            <!-- Métriques -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium">Métriques à inclure</label>
                                <div class="grid gap-2 p-4 bg-gray-50 rounded-lg">
                                    {#each metrics as metric}
                                        <label class="flex items-center gap-3 p-2 bg-white rounded-lg border 
                                                    cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                class="w-4 h-4 rounded border-gray-300 text-indigo-600 
                                                       focus:ring-indigo-500"
                                                checked={editingReport.metrics?.includes(metric.id)}
                                                on:change={() => {
                                                    if (editingReport.metrics?.includes(metric.id)) {
                                                        editingReport.metrics = editingReport.metrics.filter(m => m !== metric.id);
                                                    } else {
                                                        editingReport.metrics = [...(editingReport.metrics || []), metric.id];
                                                    }
                                                }}
                                            />
                                            <span class="flex items-center gap-2">
                                                <span class="text-lg">{metric.icon}</span>
                                                <span>{metric.label}</span>
                                            </span>
                                        </label>
                                    {/each}
                                </div>
                            </div>
                
                            <!-- Destinataires -->
                            <div class="space-y-2">
                                <label class="text-sm font-medium">Destinataires</label>
                                <div class="space-y-4">
                                    <div class="flex gap-2">
                                        <input
                                            type="email"
                                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                                                   focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="email@example.com"
                                            bind:value={newEmail}
                                            on:keydown={(e) => e.key === 'Enter' && addEmail()}
                                        />
                                        <button
                                            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                                                   transition-colors flex items-center gap-2"
                                            on:click={addEmail}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                                            </svg>
                                            Ajouter
                                        </button>
                                    </div>
                                    
                                    <div class="flex flex-wrap gap-2">
                                        {#each editingReport.recipients || [] as email}
                                            <div class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full">
                                                <span class="text-sm">{email}</span>
                                                <button
                                                    class="text-indigo-400 hover:text-indigo-600"
                                                    on:click={() => removeEmail(email)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                
                            <!-- Switch actif/inactif -->
                            <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                                <span class="text-sm font-medium">Activer ce rapport</span>
                                <button
                                    class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                                        ${editingReport.enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                    on:click={() => editingReport.enabled = !editingReport.enabled}
                                >
                                    <span
                                        class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
                                            ${editingReport.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        </div>
                
                        <DialogFooter>
                            <button
                                class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                on:click={() => showReportDialog = false}
                            >
                                Annuler
                            </button>
                            <button
                                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                                       transition-colors flex items-center gap-2"
                                on:click={saveReport}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                </svg>
                                {hasExistingReport ? 'Mettre à jour' : 'Créer'}
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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