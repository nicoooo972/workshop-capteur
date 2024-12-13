import type { EnvironmentalConditions, Recommendation } from "./types";

export function analyzeConditions(conditions: EnvironmentalConditions): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Analyse température
    if (conditions.tempTrend > 2 && conditions.roomTemp > 21) {
        recommendations.push({
            message: "Réduction du chauffage recommandée - Hausse des températures prévue",
            priority: "high",
            action: "reduce_heating"
        });
    }

    // Analyse humidité
    if (conditions.humidity > 70 && conditions.roomTemp > 23) {
        recommendations.push({
            message: "Niveau d'humidité élevé - Activation de la ventilation conseillée",
            priority: "medium",
            action: "activate_ventilation"
        });
    }

    // Analyse CO2
    if (conditions.co2 > 1000) {
        recommendations.push({
            message: "Niveau de CO2 élevé - Aération nécessaire",
            priority: "high",
            action: "ventilate"
        });
    }

    // Optimisation nocturne
    if (conditions.timeOfDay === 'night' && conditions.exteriorTemp < 15) {
        recommendations.push({
            message: "Programmation du chauffage nocturne conseillée",
            priority: "medium",
            action: "schedule_heating"
        });
    }

    // Conditions optimales pour ventilation naturelle
    if (
        conditions.exteriorTemp >= 18 && 
        conditions.exteriorTemp <= 24 && 
        conditions.precipitation < 0.1
    ) {
        recommendations.push({
            message: "Conditions idéales pour la ventilation naturelle",
            priority: "low",
            action: "natural_ventilation"
        });
    }

    return recommendations.sort((a, b) => 
        priorityWeight(a.priority) - priorityWeight(b.priority)
    );
}

function priorityWeight(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
        case 'high': return 1;
        case 'medium': return 2;
        case 'low': return 3;
        default: return 4;
    }
}
