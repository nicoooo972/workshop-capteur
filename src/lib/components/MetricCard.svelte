<script lang="ts">
    export let title: string;
    export let value: number;
    export let unit: string;
    export let thresholds: [number, number];
    export let icon: string;
  
    $: isOutOfRange = value < thresholds[0] || value > thresholds[1];
    $: statusColor = isOutOfRange ? 'text-red-500' : 'text-green-500';
  </script>
  
  <div class="bg-white p-4 rounded-lg shadow-md">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-gray-700">{title}</h3>
      <span class="text-gray-500">
        <!-- Vous pouvez utiliser une bibliothèque d'icônes comme @sveltejs/svelte-icons -->
        {icon}
      </span>
    </div>
    
    <div class="mt-2">
      <span class="text-2xl font-bold">{value}</span>
      <span class="text-gray-600 ml-1">{unit}</span>
    </div>
    
    <div class="mt-2 text-sm {statusColor}">
      Seuils: {thresholds[0]} - {thresholds[1]} {unit}
    </div>
  </div>