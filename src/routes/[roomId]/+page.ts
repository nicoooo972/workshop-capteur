import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  // Validation basique de l'ID de la salle
  if (!params.roomId.startsWith('salle_')) {
    throw error(404, 'Salle non trouvée');
  }

  return {
    roomId: params.roomId
  };
};