<script lang="ts">
    import { getContext } from 'svelte';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Info } from 'lucide-svelte';

    export let message: string;
    export let priority: string;

    function getRecommendationDetails(message: string) {
    switch (message) {
        case "Niveau de CO2 élevé - Aération nécessaire":
            return {
                title: "Qualité de l'air - Niveau de CO2",
                description: "Un niveau élevé de CO2 peut affecter la concentration et le bien-être. Une bonne ventilation permet de maintenir un environnement sain et productif.",
                links: [
                    {
                        text: "Impact du CO2 sur la santé",
                        url: "https://www.anses.fr/fr/content/qualite-de-lair-interieur-1"
                    },
                    {
                        text: "Guide de la ventilation",
                        url: "https://librairie.ademe.fr/ged/7180/guide-bien-ventiler-logement-202307.pdf"
                    }
                ]
            };

        case "Programmation du chauffage nocturne conseillée":
            return {
                title: "Gestion du chauffage nocturne",
                description: "La programmation nocturne du chauffage permet d'optimiser la consommation énergétique tout en maintenant une température confortable pendant les heures d'occupation.",
                links: [
                    {
                        text: "La nuit, baissez la température de votre chauffage",
                        url: "https://www.viessmann.fr/fr/blog-expert/economiser-energie/baisser-chauffage-nuit.html"
                    },
                    {
                        text: "Optimisation du chauffage",
                        url: "https://www.energie-info.fr/fiche_pratique/comment-bien-utiliser-son-chauffage"
                    }
                ]
            };

        case "Température extérieure favorable - Ventilation naturelle possible":
            return {
                title: "Ventilation naturelle",
                description: "Profiter de la température extérieure favorable pour ventiler naturellement permet de réduire la consommation énergétique tout en améliorant la qualité de l'air.",
                links: [
                    {
                        text: "Économies d'énergie et ventilation",
                        url: "https://librairie.ademe.fr/ged/7180/guide-bien-ventiler-logement-202307.pdf"
                    }
                ]
            };

        case "Réduction du chauffage recommandée":
            return {
                title: "Optimisation du chauffage",
                description: "Une température trop élevée entraîne un gaspillage d'énergie. Réduire légèrement le chauffage permet de réaliser des économies significatives.",
                links: [
                    {
                        text: "Température idéale par pièce",
                        url: "https://www.ademe.fr/particuliers-eco-citoyens/habitation/bien-gerer-habitat/quelles-temperatures-ideales-hiver"
                    }
                ]
            };

        case "Activation de la climatisation conseillée":
            return {
                title: "Gestion de la climatisation",
                description: "L'utilisation raisonnée de la climatisation permet de maintenir un confort optimal tout en maîtrisant la consommation énergétique.",
                links: [

                    {
                        text: "limiter la consommation d'électricité",
                        url: "https://agirpourlatransition.ademe.fr/particuliers/maison/confort-ete/climatisation-comment-limiter-consommation-electricite"
                    }
                ]
            };

        default:
            return {
                title: "Recommandation",
                description: "Détails de la recommandation à venir.",
                links: []
            };
    }
}

    const details = getRecommendationDetails(message);
</script>

<Dialog.Root>
    <Dialog.Trigger>
        <div class="flex items-center gap-2 cursor-pointer">
            <Info class="w-4 h-4" />
            <p class="text-sm">{message}</p>
        </div>
    </Dialog.Trigger>

    <Dialog.Content class="max-w-md">
        <Dialog.Header>
            <Dialog.Title>{details.title}</Dialog.Title>
        </Dialog.Header>
        <div class="mt-4">
            <p class="text-gray-600 mb-4">{details.description}</p>
            {#if details.links && details.links.length > 0}
                <div class="space-y-2">
                    <h4 class="font-medium">Pour en savoir plus :</h4>
                    <ul class="list-disc pl-4 space-y-1">
                        {#each details.links as link}
                            <li>
                                <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-indigo-600 hover:text-indigo-800"
                                >
                                    {link.text}
                                </a>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root>