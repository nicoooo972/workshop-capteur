<script lang="ts">
  export let title: string;
  export let value: number;
  export let unit: string;
  export let thresholds: [number, number];
  export let icon: string;

  // Calcul du statut en fonction des seuils
  $: isWithinThresholds = value >= thresholds[0] && value <= thresholds[1];
  
  // Fonction pour obtenir les classes de couleur en fonction du statut
  $: statusColors = isWithinThresholds
    ? {
        text: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200'
      }
    : {
        text: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200'
      };
</script>

<div class="bg-white p-6 rounded-lg shadow-md border-2 transition-colors duration-200 {statusColors.border} {statusColors.bg}">
  <div class="flex items-center justify-between mb-4">
    <div class="text-2xl">{icon}</div>
    <div class="text-sm font-medium text-gray-500 flex items-center gap-2">
      Seuils : {thresholds[0]}-{thresholds[1]} {unit}
      {#if isWithinThresholds}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      {/if}
    </div>
  </div>
  
  <h3 class="text-lg font-medium text-gray-700 mb-2">{title}</h3>
  
  <div class="flex items-end gap-2">
    <span class="text-3xl font-bold transition-colors duration-200 {statusColors.text}">
      {value.toFixed(1)}
    </span>
    <span class="text-lg transition-colors duration-200 {statusColors.text}">
      {unit}
    </span>
  </div>
</div>