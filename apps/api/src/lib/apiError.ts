// CAÇAOFERTA — Erros padronizados da API (FASE 06).
// Envelope único de erro: { success:false, error:{ code, message } }.

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ALREADY_SAVED: 'ALREADY_SAVED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const notFound = (message = 'Recurso não encontrado.'): ApiError =>
  new ApiError(404, ERROR_CODES.NOT_FOUND, message);

export const unauthorized = (message = 'Autenticação necessária.'): ApiError =>
  new ApiError(401, ERROR_CODES.UNAUTHORIZED, message);

function errorBody(error: ApiError): Record<string, unknown> {
  return { success: false, error: { code: error.code, message: error.message } };
}

/** Handler global: converte ApiError/ZodError/desconhecidos no envelope padrão. */
export function registerErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send(errorBody(error));
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Dados inválidos.',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }

    // Erros controlados do Fastify (ex.: JSON malformado) já carregam 4xx.
    const status = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? ((error as { statusCode: number }).statusCode)
      : undefined;
    if (status !== undefined && status >= 400 && status < 500) {
      const quickError = error as { message?: string };
      return reply.status(status).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: typeof quickError.message === 'string' ? quickError.message : 'Requisição inválida.',
        },
      });
    }

    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: { code: ERROR_CODES.INTERNAL, message: 'Erro interno do servidor.' },
    });
  });
}