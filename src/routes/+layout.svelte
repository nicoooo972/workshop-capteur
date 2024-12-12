<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { sensors } from '$lib/stores/sensors';
    import '../app.css';
    import { auth } from '$lib/stores/auth';
    import { authService } from '$lib/services/auth';


    
    onMount(async () => {
        sensors.init();

        try {
            const isAuthenticated = await authService.checkAuth();
            if (!isAuthenticated) {
                auth.logout();
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'authentification:', error);
        }
    });

    onDestroy(() => {
        sensors.destroy();
    });
</script>

<slot />