import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  try {
    // Validation plus complète de l'ID de la salle
    const { roomId } = params;
    
    if (!roomId || !roomId.match(/^salle_\d+_\d+$/)) {
      throw error(404, 'Salle non trouvée');
    }

    return {
      roomId
    };
  } catch (e) {
    console.error('Erreur lors du chargement de la page:', e);
    throw error(500, 'Erreur lors du chargement de la page');
  }
};