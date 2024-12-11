import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load = (({ params }) => {
    const { roomId } = params;
    
    if (!roomId) {
        throw error(404, 'ID de salle manquant');
    }

    // Debug
    console.log('Page Load - roomId:', roomId);

    return {
        roomId
    };
}) satisfies PageLoad;