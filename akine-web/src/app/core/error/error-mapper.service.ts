import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../auth/models/auth.models';

/**
 * Converts HttpErrorResponse → user-friendly Spanish string.
 *
 * Priority:
 *   1. Backend body: { code, message } — used as-is.
 *   2. HTTP status fallback.
 *   3. Generic message.
 */
@Injectable({ providedIn: 'root' })
export class ErrorMapperService {
  toMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'Error inesperado. Intentá nuevamente.';
    }

    // Backend custom format: { code, message, details? }
    const body = err.error as Partial<ApiError>;
    if (body?.message) return body.message;

    return this.byStatus(err.status);
  }

  byStatus(status: number): string {
    const map: Record<number, string> = {
      0: 'Sin conexión al servidor. Verificá tu conexión a internet.',
      400: 'Datos inválidos. Revisá los campos ingresados.',
      401: 'No autorizado. Iniciá sesión nuevamente.',
      403: 'Sin permisos para realizar esta acción.',
      404: 'Recurso no encontrado.',
      409: 'El recurso ya existe (posible duplicado).',
      422: 'Error de validación. Revisá los datos enviados.',
      429: 'Demasiados intentos. Esperá unos minutos antes de reintentar.',
      500: 'Error interno del servidor. Intentá más tarde.',
      503: 'Servicio no disponible temporalmente.',
    };
    return map[status] ?? `Error al comunicarse con el servidor (${status}).`;
  }
}
