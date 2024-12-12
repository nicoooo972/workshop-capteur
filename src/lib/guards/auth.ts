import { authService } from '$lib/services/auth';
import type { Handle } from '@sveltejs/kit';

export const authGuard: Handle = async ({ event, resolve }) => {
  const token = event.request.headers.get('Authorization')?.split('Bearer ')[1];
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = authService.verifyToken(token);
  if (!user) {
    return new Response('Invalid token', { status: 401 });
  }

  event.locals.user = user;
  return resolve(event);
};