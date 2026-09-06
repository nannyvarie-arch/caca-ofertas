import { describe, expect, it } from 'vitest';
import { buildServer } from '../app';

describe('GET /health', () => {
  it('responde status ok com o serviço caçaoferta-api', async () => {
    const server = buildServer();
    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('caçaoferta-api');
    expect(typeof body.timestamp).toBe('string');

    await server.close();
  });
});