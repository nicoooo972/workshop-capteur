<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';
  import { Dialog } from '$lib/components/ui/dialog';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
  import { jsPDF } from 'jspdf';
  
  export let data: Array<{
      timestamp: number;
      co2: number;
      temperature: number;
      humidity: number;
  }>;
  export let metric: 'co2' | 'temperature' | 'humidity';
  
  let canvas: HTMLCanvasElement;
  let chart: Chart;
  let showDialog = false;
  let selectedPoint: any = null;
  let analysisTab = 'details';
  let chartType = 'line';
  let comparisonPeriod: 'none' | 'previous' | 'custom' = 'none';
  let customStartDate: string = '';
  let customEndDate: string = '';
  let showPredictions = false;
  
  // Configuration des métriques
  const metricConfig = {
      co2: {
          label: 'CO2 (ppm)',
          color: 'rgb(239, 68, 68)',
          fill: 'rgba(239, 68, 68, 0.1)',
          thresholds: [400, 1000],
          unit: 'ppm',
          recommendations: {
              high: [
                  "Ouvrir les fenêtres pendant 10 minutes",
                  "Vérifier le système de ventilation",
                  "Réduire le nombre de personnes dans la pièce"
              ],
              low: [
                  "Vérifier l'étalonnage du capteur",
                  "S'assurer que la pièce n'est pas sur-ventilée"
              ]
          }
      },
      temperature: {
          label: 'Température (°C)',
          color: 'rgb(59, 130, 246)',
          fill: 'rgba(59, 130, 246, 0.1)',
          thresholds: [18, 26],
          unit: '°C',
          recommendations: {
              high: [
                  "Activer la climatisation",
                  "Fermer les stores ou rideaux",
                  "Éteindre les appareils non essentiels"
              ],
              low: [
                  "Augmenter le chauffage",
                  "Vérifier l'isolation des fenêtres",
                  "Fermer les portes pour éviter les pertes de chaleur"
              ]
          }
      },
      humidity: {
          label: 'Humidité (%)',
          color: 'rgb(16, 185, 129)',
          fill: 'rgba(16, 185, 129, 0.1)',
          thresholds: [30, 70],
          unit: '%',
          recommendations: {
              high: [
                  "Activer le déshumidificateur",
                  "Améliorer la ventilation",
                  "Vérifier les sources potentielles d'humidité"
              ],
              low: [
                  "Utiliser un humidificateur",
                  "Ajouter des plantes d'intérieur",
                  "Éviter la sur-ventilation"
              ]
          }
      }
  };
  // Fonction pour obtenir les recommandations
  function getRecommendations(value: number, metric: string) {
      const config = metricConfig[metric];
      if (value > config.thresholds[1]) {
          return {
              status: 'high',
              recommendations: config.recommendations.high
          };
      } else if (value < config.thresholds[0]) {
          return {
              status: 'low',
              recommendations: config.recommendations.low
          };
      }
      return null;
  }

  $: if (canvas && data) {
      if (chart) chart.destroy();
      
      const config = metricConfig[metric];
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
      
      // Création d'un plugin personnalisé pour les seuils
      const thresholdPlugin = {
          id: 'thresholds',
          beforeDraw: (chart) => {
              const ctx = chart.ctx;
              const yAxis = chart.scales.y;
              const thresholds = config.thresholds;
              
              // Dessiner les lignes de seuil
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

      chart = new Chart(canvas, {
          type: 'line',
          data: {
              labels: sortedData.map(d => new Date(d.timestamp).toLocaleString('fr-FR')),
              datasets: [{
                  label: config.label,
                  data: sortedData.map(d => d[metric]),
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
                      display: true
                  },
                  tooltip: {
                      mode: 'index',
                      intersect: false,
                      callbacks: {
                          label: (context) => {
                              const value = context.raw as number;
                              let label = `${config.label}: ${value}`;
                              if (value > config.thresholds[1]) {
                                  label += ' ⚠️ Valeur trop élevée';
                              } else if (value < config.thresholds[0]) {
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
                          minRotation: 45
                      }
                  },
                  y: {
                      afterDataLimits: (scale) => {
                          // Ajuster les limites pour montrer les seuils
                          const margins = (scale.max - scale.min) * 0.1;
                          scale.max += margins;
                          scale.min -= margins;
                      }
                  }
              },
              onClick: (event, elements) => {
                  if (elements && elements.length > 0) {
                      const index = elements[0].index;
                      selectedPoint = {
                          value: sortedData[index][metric],
                          timestamp: sortedData[index].timestamp,
                          recommendations: getRecommendations(sortedData[index][metric], metric)
                      };
                      showDialog = true;
                  }
              }
          },
          plugins: [thresholdPlugin]
      });
  }
  
  onMount(() => {
      return () => {
          if (chart) chart.destroy();
      };
  });
</script>

<div class="w-full h-[300px]">
  <canvas bind:this={canvas}></canvas>
</div>

{#if showDialog && selectedPoint}
  <Dialog 
      open={showDialog} 
      onOpenChange={(open) => showDialog = open}
  >
      <div class="p-6">
          <h2 class="text-xl font-bold mb-4">
              Détails de la mesure
          </h2>
          
          <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                  <div>
                      <span class="text-gray-600">Date :</span>
                      <span class="font-medium">
                          {new Date(selectedPoint.timestamp).toLocaleString('fr-FR')}
                      </span>
                  </div>
                  <div>
                      <span class="text-gray-600">Valeur :</span>
                      <span class="font-medium">
                          {selectedPoint.value.toFixed(1)} {metricConfig[metric].unit}
                      </span>
                  </div>
              </div>

              {#if selectedPoint.recommendations}
                  <div class="mt-6">
                      <h3 class="text-lg font-semibold mb-2">
                          Recommandations
                      </h3>
                      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <p class="text-orange-800 mb-2">
                              {selectedPoint.recommendations.status === 'high' 
                                  ? '⚠️ Valeur trop élevée'
                                  : '⚠️ Valeur trop basse'
                              }
                          </p>
                          <ul class="list-disc list-inside space-y-2">
                              {#each selectedPoint.recommendations.recommendations as recommendation}
                                  <li class="text-orange-700">{recommendation}</li>
                              {/each}
                          </ul>
                      </div>
                  </div>
              {:else}
                  <div class="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                      <p class="text-green-800">
                          ✅ Valeur dans les seuils normaux
                      </p>
                  </div>
              {/if}
          </div>
      </div>
  </Dialog>
{/if}