<script lang="ts">
    import { onMount } from 'svelte';
    
    let deferredPrompt: any;
    let showInstallButton = false;

    onMount(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            showInstallButton = true;
        });
    });

    async function installPWA() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('PWA installed');
            }
            deferredPrompt = null;
            showInstallButton = false;
        }
    }
</script>

{#if showInstallButton}
    <button
        class="fixed bottom-4 right-4 px-4 py-2 bg-indigo-600 text-white rounded-lg 
               shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        on:click={installPWA}
    >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        Installer l'application
    </button>
{/if}