<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { sensors } from '$lib/stores/sensors';
    import '../app.css';

    onMount(() => {
        sensors.init();
    });

    onDestroy(() => {
        sensors.destroy();
    });
</script>

<slot />