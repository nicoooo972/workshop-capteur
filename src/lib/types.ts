export interface EnvironmentalConditions {
    roomTemp: number;
    exteriorTemp: number;
    tempTrend: number;
    humidity: number;
    co2: number;
    precipitation: number;
    timeOfDay: 'day' | 'night';
}

export interface Recommendation {
    message: string;
    priority: 'high' | 'medium' | 'low';
    action?: string;
}