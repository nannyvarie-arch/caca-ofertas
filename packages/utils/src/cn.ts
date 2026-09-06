export type ClassValue = string | number | false | null | undefined;

/**
 * Junta nomes de classe removendo valores falsy.
 */
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ');
}