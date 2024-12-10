<script lang="ts">
    export let show = false;
    export let onClose: () => void;

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            onClose();
        }
    }

    function handleBackdropClick(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown}/>

{#if show}
    <div 
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8"
        on:click={handleBackdropClick}
        transition:fade
    >
        <div 
            class="bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all"
            role="dialog"
            aria-modal="true"
            transition:fly={{ y: 20, duration: 200 }}
        >
            <slot />
        </div>
    </div>
{/if}

<style>
    /* Animations de transition */
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .modal-backdrop {
        animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
        animation: slideIn 0.2s ease-out;
    }
</style>