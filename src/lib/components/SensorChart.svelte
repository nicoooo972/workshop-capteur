<script lang="ts">
    import { onMount } from 'svelte';
    import Chart from 'chart.js/auto';
    
    export let data: Array<{
      timestamp: number;
      co2: number;
      temperature: number;
      humidity: number;
    }>;
    export let metric: 'co2' | 'temperature' | 'humidity';
    
    let canvas: HTMLCanvasElement;
    let chart: Chart;
    
    // Configuration des couleurs et labels pour chaque métrique
    const metricConfig = {
      co2: {
        label: 'CO2 (ppm)',
        color: 'rgb(239, 68, 68)',
        fill: 'rgba(239, 68, 68, 0.1)'
      },
      temperature: {
        label: 'Température (°C)',
        color: 'rgb(59, 130, 246)',
        fill: 'rgba(59, 130, 246, 0.1)'
      },
      humidity: {
        label: 'Humidité (%)',
        color: 'rgb(16, 185, 129)',
        fill: 'rgba(16, 185, 129, 0.1)'
      }
    };
  
    $: if (canvas && data) {
      if (chart) chart.destroy();
      
      const config = metricConfig[metric];
      const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
      
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
              intersect: false
            }
          },
          scales: {
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45
              }
            }
          }
        }
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