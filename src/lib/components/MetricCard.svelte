<script lang="ts">
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "$lib/components/ui/dialog";
  import { Wind, ThermometerSun, Droplets, AlertTriangle } from 'lucide-svelte';

  export let title: string;
  export let value: number;
  export let unit: string;
  export let thresholds: [number, number];
  export let icon: string;

  let showRecommendations = false;

  // Calcul du statut avec une zone proche des seuils
  $: {
    const threshold1 = thresholds[0];
    const threshold2 = thresholds[1];
    const range = threshold2 - threshold1;
    const warningBuffer = range * 0.1; // 10% pour warning
    const approachingBuffer = range * 0.2; // 20% pour approaching
    
    const warningLow = threshold1 + warningBuffer;
    const warningHigh = threshold2 - warningBuffer;
    const approachingLow = threshold1 + approachingBuffer;
    const approachingHigh = threshold2 - approachingBuffer;
    
    if (value < threshold1 || value > threshold2) {
      status = 'critical';
    } else if (value < warningLow || value > warningHigh) {
      status = 'warning';
    } else if (value < approachingLow || value > approachingHigh) {
      status = 'approaching';
    } else {
      status = 'normal';
    }
  }

  $: statusConfig = {
    normal: {
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: '✓',
      progressColor: 'bg-green-500'
    },
    approaching: {
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: 'ℹ️',
      progressColor: 'bg-blue-500'
    },
    warning: {
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: '⚠️',
      progressColor: 'bg-orange-500'
    },
    critical: {
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: '⚠️',
      progressColor: 'bg-red-500'
    }
  };

  let status: 'normal' | 'approaching' | 'warning' | 'critical' = 'normal';

  const getMetricType = (title: string): string => {
    const normalizedTitle = title.toLowerCase();
    if (normalizedTitle.includes('co2')) return 'co2';
    if (normalizedTitle.includes('temp')) return 'temperature';
    if (normalizedTitle.includes('hum')) return 'humidity';
    return normalizedTitle;
  };

  const getIconComponent = (type: string) => {
    switch (getMetricType(type)) {
      case 'co2':
        return Wind;
      case 'temperature':
        return ThermometerSun;
      case 'humidity':
        return Droplets;
      default:
        return AlertTriangle;
    }
  };

  const recommendationsMap = {
    co2: {
      approaching: [
        "Prévoir une ventilation dans les 30 prochaines minutes",
        "Surveiller le nombre de personnes dans la pièce",
        "Préparer le système de ventilation mécanique"
      ],
      immediate: [
        "Ouvrir immédiatement les fenêtres pendant 10 minutes",
        "Réduire le nombre de personnes dans la pièce",
        "Activer la ventilation mécanique"
      ],
      preventive: [
        "Planifier des cycles de ventilation réguliers",
        "Vérifier le système de ventilation",
        "Installer des détecteurs de CO2 supplémentaires"
      ],
      maintenance: [
        "Faire contrôler le système de ventilation",
        "Nettoyer les filtres",
        "Vérifier l'étanchéité des conduits"
      ]
    },
    temperature: {
      approaching: [
        "Ajuster légèrement la température",
        "Vérifier la position des stores",
        "Anticiper les variations de température"
      ],
      immediate: [
        "Ajuster la climatisation/chauffage",
        "Fermer/ouvrir les stores selon la situation",
        "Utiliser des ventilateurs d'appoint"
      ],
      preventive: [
        "Programmer la régulation thermique",
        "Isoler les sources de chaleur/froid",
        "Installer des stores automatiques"
      ],
      maintenance: [
        "Vérifier l'isolation des fenêtres",
        "Entretenir les systèmes CVC",
        "Calibrer les thermostats"
      ]
    },
    humidity: {
      approaching: [
        "Surveiller l'évolution de l'humidité",
        "Préparer le déshumidificateur/humidificateur",
        "Vérifier les sources potentielles d'humidité"
      ],
      immediate: [
        "Activer déshumidificateur/humidificateur",
        "Augmenter la ventilation",
        "Éliminer les sources d'humidité visibles"
      ],
      preventive: [
        "Installer des hygrostats",
        "Améliorer l'isolation",
        "Mettre en place un suivi régulier"
      ],
      maintenance: [
        "Vérifier l'étanchéité du bâtiment",
        "Entretenir les systèmes de ventilation",
        "Contrôler les points de condensation"
      ]
    }
  };

  const getCurrentRecommendations = () => {
    const metricType = getMetricType(title);
    return recommendationsMap[metricType as keyof typeof recommendationsMap] || {
      approaching: [],
      immediate: [],
      preventive: [],
      maintenance: []
    };
  };

  // Calcul du pourcentage pour la barre de progression
  $: progressPercentage = (() => {
    const min = thresholds[0];
    const max = thresholds[1];
    const range = max - min;
    const normalized = ((value - min) / range) * 100;
    return Math.min(Math.max(normalized, 0), 100);
  })();

  $: IconComponent = getIconComponent(title);

  $: statusText = {
    normal: 'Valeurs optimales',
    approaching: 'Surveillance recommandée',
    warning: 'Attention requise',
    critical: 'Action urgente nécessaire'
  }[status];

  $: hasRecommendations = status !== 'normal' && Object.values(getCurrentRecommendations()).some(arr => arr.length > 0);
</script>

<div 
  class="rounded-lg border bg-white relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-200"
  class:border-green-200={status === 'normal'}
  class:border-blue-200={status === 'approaching'}
  class:border-orange-200={status === 'warning'}
  class:border-red-200={status === 'critical'}
  on:click={() => hasRecommendations && (showRecommendations = true)}
>
  <div class="p-4 relative">
    <!-- En-tête -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <span>{icon}</span>
        <span class="font-medium text-gray-900">{title}</span>
      </div>
      {#if hasRecommendations}
        <div class="flex items-center gap-2">
          <span class="{statusConfig[status].textColor} text-sm">
            Voir les recommandations
          </span>
          <svelte:component 
            this={IconComponent}
            class={statusConfig[status].textColor}
            size={18}
          />
        </div>
      {/if}
    </div>

    <!-- Valeur -->
    <div class="flex items-baseline gap-2 mb-2">
      <span class="text-3xl font-bold {statusConfig[status].textColor}">
        {value.toFixed(1)}
      </span>
      <span class={statusConfig[status].textColor}>{unit}</span>
    </div>

    <!-- Status -->
    <div class="text-sm {statusConfig[status].textColor} mb-2">
      {statusText}
    </div>

    <!-- Barre de progression -->
    <div class="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
      <div
        class="h-full transition-all duration-500 rounded-full {statusConfig[status].progressColor}"
        style="width: {progressPercentage}%"
      />
    </div>

    <!-- Seuils -->
    <div class="flex justify-between mt-1 text-xs text-gray-500">
      <span>{thresholds[0]} {unit}</span>
      <span>{thresholds[1]} {unit}</span>
    </div>
  </div>
</div>

<!-- Dialog des recommandations -->
{#if showRecommendations && hasRecommendations}
  <Dialog bind:open={showRecommendations}>
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <svelte:component this={IconComponent} class={statusConfig[status].textColor} size={24} />
          <div>
            <DialogTitle class="text-xl">Recommandations pour {title}</DialogTitle>
            <DialogDescription>
              {statusText}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div class="grid gap-6 py-4">
        {#if status === 'approaching'}
          <div class="space-y-3">
            <h3 class="font-medium text-gray-900">Actions préventives recommandées</h3>
            <div class="space-y-2">
              {#each getCurrentRecommendations().approaching as item}
                <div class="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                  <div class="mt-1 {statusConfig[status].textColor}">•</div>
                  <p class="text-sm text-gray-700">{item}</p>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          {#each Object.entries(getCurrentRecommendations()) as [category, items]}
            {#if category !== 'approaching' && items.length > 0}
              <div class="space-y-3">
                <h3 class="font-medium text-gray-900 capitalize">
                  {category === 'immediate' ? 'Actions immédiates' :
                   category === 'preventive' ? 'Mesures préventives' :
                   'Maintenance recommandée'}
                </h3>
                <div class="space-y-2">
                  {#each items as item}
                    <div class="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                      <div class="mt-1 {statusConfig[status].textColor}">•</div>
                      <p class="text-sm text-gray-700">{item}</p>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        {/if}

        <!-- Info supplémentaire -->
        <div class="mt-4 p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600">
            Valeur actuelle: <span class="font-medium">{value.toFixed(1)} {unit}</span><br>
            Plage recommandée: <span class="font-medium">{thresholds[0]} - {thresholds[1]} {unit}</span>
          </p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
{/if}