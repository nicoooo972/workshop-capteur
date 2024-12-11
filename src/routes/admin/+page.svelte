<script lang="ts">
    import { onMount } from 'svelte';
    import { adminSettings, type ReportSchedule } from '$lib/stores/adminSettings';
    import { sensors } from '$lib/stores/sensors';
    import Header from '../Header.svelte';
    import { Dialog, DialogContent } from '$lib/components/ui/dialog';
    
    let showScheduleDialog = false;
    let editingSchedule: Partial<ReportSchedule> = {
        frequency: 'daily',
        time: '08:00',
        recipients: [],
        roomIds: [],
        metrics: [],
        enabled: true
    };
    
    let newEmail = '';
    
    const frequencies = [
        { id: 'daily', label: 'Quotidien' },
        { id: 'weekly', label: 'Hebdomadaire' },
        { id: 'monthly', label: 'Mensuel' }
    ];
    
    const metrics = [
        { id: 'temperature', label: 'Température', icon: '🌡️' },
        { id: 'humidity', label: 'Humidité', icon: '💧' },
        { id: 'co2', label: 'CO2', icon: '📊' }
    ];
    
    function addEmail() {
        if (newEmail && newEmail.includes('@')) {
            editingSchedule.recipients = [...(editingSchedule.recipients || []), newEmail];
            newEmail = '';
        }
    }
    
    function removeEmail(email: string) {
        editingSchedule.recipients = editingSchedule.recipients?.filter(e => e !== email);
    }
    
    async function saveSchedule() {
        if (editingSchedule.id) {
            await adminSettings.updateSchedule(editingSchedule.id, editingSchedule as ReportSchedule);
        } else {
            await adminSettings.addSchedule(editingSchedule as ReportSchedule);
        }
        showScheduleDialog = false;
    }
    
    onMount(() => {
        adminSettings.init();
    });
</script>

<svelte:head>
    <title>Administration - Monitoring</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
    <Header 
        title="Administration"
        subtitle="Gestion des rapports automatiques"
        showBack={true}
    />

    <main class="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto space-y-8">
            <!-- En-tête -->
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-900">Rapports automatiques</h2>
                <button
                    class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    on:click={() => {
                        editingSchedule = {
                            frequency: 'daily',
                            time: '08:00',
                            recipients: [],
                            roomIds: [],
                            metrics: [],
                            enabled: true
                        };
                        showScheduleDialog = true;
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                    Nouveau rapport
                </button>
            </div>

            <!-- Liste des rapports programmés -->
            {#if $adminSettings.length === 0}
                <div class="bg-white rounded-lg shadow-sm p-6 text-center">
                    <p class="text-gray-500">Aucun rapport automatique configuré</p>
                </div>
            {:else}
                <div class="grid gap-6">
                    {#each $adminSettings as schedule}
                        <div class="bg-white rounded-lg shadow-sm p-6">
                            <div class="flex items-start justify-between">
                                <div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-lg font-medium">
                                            Rapport {schedule.frequency}
                                        </span>
                                        <span class={`px-2 py-1 text-sm rounded-full ${schedule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {schedule.enabled ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>
                                    <div class="mt-2 text-sm text-gray-600">
                                        Envoyé à {schedule.time}
                                        {#if schedule.frequency === 'weekly'}
                                            le {['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][schedule.day || 0]}
                                        {:else if schedule.frequency === 'monthly'}
                                            le {schedule.day} du mois
                                        {/if}
                                    </div>
                                    <div class="mt-4 space-y-2">
                                        <div class="flex flex-wrap gap-2">
                                            {#each schedule.metrics as metric}
                                                <span class="px-2 py-1 bg-gray-100 rounded-full text-sm">
                                                    {metrics.find(m => m.id === metric)?.label}
                                                </span>
                                            {/each}
                                        </div>
                                        <div class="text-sm text-gray-600">
                                            {schedule.recipients.length} destinataire{schedule.recipients.length > 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button
                                        class="p-2 text-gray-400 hover:text-gray-600"
                                        on:click={() => {
                                            editingSchedule = { ...schedule };
                                            showScheduleDialog = true;
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    <button
                                        class="p-2 text-gray-400 hover:text-red-600"
                                        on:click={() => adminSettings.deleteSchedule(schedule.id)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </main>
</div>

<!-- Dialogue de configuration -->
{#if showScheduleDialog}
<Dialog {open} onOpenChange={(open) => showScheduleDialog = open}>
    <DialogContent>

        <div class="p-6 max-w-2xl w-full">
            <h2 class="text-xl font-bold mb-6">
                {editingSchedule.id ? 'Modifier le rapport' : 'Nouveau rapport'}
            </h2>
            
            <div class="space-y-6">
                <!-- Fréquence -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Fréquence d'envoi
                    </label>
                    <div class="grid grid-cols-3 gap-2">
                        {#each frequencies as freq}
                            <button
                                class="p-3 border rounded-lg text-center transition-colors
                                    {editingSchedule.frequency === freq.id 
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                                        : 'hover:bg-gray-50'}"
                                on:click={() => editingSchedule.frequency = freq.id}
                            >
                                {freq.label}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Heure d'envoi -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Heure d'envoi
                    </label>
                    <input
                        type="time"
                        class="w-full border-gray-300 rounded-lg shadow-sm"
                        bind:value={editingSchedule.time}
                    />
                </div>

                <!-- Jour (pour weekly/monthly) -->
                {#if editingSchedule.frequency === 'weekly'}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Jour de la semaine
                        </label>
                        <select
                            class="w-full border-gray-300 rounded-lg shadow-sm"
                            bind:value={editingSchedule.day}
                        >
                            {#each ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as day, i}
                                <option value={i}>{day}</option>
                            {/each}
                        </select>
                    </div>
                {:else if editingSchedule.frequency === 'monthly'}
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">
                            Jour du mois
                        </label>
                        <select
                            class="w-full border-gray-300 rounded-lg shadow-sm"
                            bind:value={editingSchedule.day}
                        >
                            {#each Array(31).fill(0).map((_, i) => i + 1) as day}
                                <option value={day}>{day}</option>
                            {/each}
                        </select>
                    </div>
                {/if}

                <!-- Métriques -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Métriques à inclure
                    </label>
                    <div class="space-y-2">
                        {#each metrics as metric}
                            <label class="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    class="rounded border-gray-300 text-indigo-600"
                                    checked={editingSchedule.metrics?.includes(metric.id)}
                                    on:change={() => {
                                        if (editingSchedule.metrics?.includes(metric.id)) {
                                            editingSchedule.metrics = editingSchedule.metrics.filter(m => m !== metric.id);
                                        } else {
                                            editingSchedule.metrics = [...(editingSchedule.metrics || []), metric.id];
                                        }
                                    }}
                                />
                                <span>{metric.icon} {metric.label}</span>
                            </label>
                        {/each}
                    </div>
                </div>

                <!-- Salles -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Salles à surveiller
                    </label>
                    <div class="space-y-2">
                        {#each $sensors as room}
                            <label class="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    class="rounded border-gray-300 text-indigo-600"
                                    checked={editingSchedule.roomIds?.includes(room.id)}
                                    on:change={() => {
                                        if (editingSchedule.roomIds?.includes(room.id)) {
                                            editingSchedule.roomIds = editingSchedule.roomIds.filter(id => id !== room.id);
                                        } else {
                                            editingSchedule.roomIds = [...(editingSchedule.roomIds || []), room.id];
                                        }
                                    }}
                                />
                                <span>{room.title || `Salle ${room.id}`}</span>
                            </label>
                        {/each}
                    </div>
                </div>

                <!-- Destinataires -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Destinataires
                    </label>
                    <div class="space-y-4">
                        <div class="flex gap-2">
                            <input
                                type="email"
                                class="flex-1 border-gray-300 rounded-lg shadow-sm"
                                placeholder="email@example.com"
                                bind:value={newEmail}
                                on:keydown={(e) => e.key === 'Enter' && addEmail()}
                            />
                            <button
                                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                on:click={addEmail}
                            >
                                Ajouter
                            </button>
                        </div>
                        
                        <div class="flex flex-wrap gap-2">
                            {#each editingSchedule.recipients || [] as email}
                                <div class="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                                    <span class="text-sm">{email}</span>
                                    <button
                                        class="text-gray-500 hover:text-red-600"
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

                <!-- Actif/Inactif -->
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-gray-700">Activer ce rapport</span>
                    <button
                        class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${editingSchedule.enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        on:click={() => editingSchedule.enabled = !editingSchedule.enabled}
                    >
                        <span
                            class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${editingSchedule.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                    </button>
                </div>

                <!-- Boutons d'action -->
                <div class="flex justify-end gap-2 mt-6">
                    <button
                        class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        on:click={() => showScheduleDialog = false}
                    >
                        Annuler
                    </button>
                    <button
                        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        on:click={saveSchedule}
                    >
                        {editingSchedule.id ? 'Mettre à jour' : 'Créer'}
                    </button>
                </div>
            </div>
        </div>
    </DialogContent>
</Dialog>
{/if}