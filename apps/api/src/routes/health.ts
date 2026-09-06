import type { FastifyInstance } from 'fastify';
import { HealthResponseSchema } from '@caca-oferta/shared';

const SERVICE_NAME = 'caçaoferta-api';

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', async () => {
    return HealthResponseSchema.parse({
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
    });
  });
}