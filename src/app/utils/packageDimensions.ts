import type { SuperfretePackage } from '../../services/superfreteService';

export interface PackageDimensionInputs {
  weight: string;
  height: string;
  width: string;
  length: string;
}

export const DEFAULT_SUPERFRETE_PACKAGE: SuperfretePackage = {
  weight: 0.3,
  height: 6,
  width: 16,
  length: 20,
};

/**
 * Permite apenas números decimais positivos (converte vírgula em ponto).
 */
export function sanitizeDecimalInput(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const dotIndex = normalized.indexOf('.');
  if (dotIndex === -1) return normalized;
  return `${normalized.slice(0, dotIndex + 1)}${normalized.slice(dotIndex + 1).replace(/\./g, '')}`;
}

/**
 * Permite apenas dígitos inteiros.
 */
export function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D/g, '');
}

export function toPackageDimensionInputs(
  pkg?: Partial<SuperfretePackage> | null,
): PackageDimensionInputs {
  return {
    weight: String(pkg?.weight ?? DEFAULT_SUPERFRETE_PACKAGE.weight),
    height: String(pkg?.height ?? DEFAULT_SUPERFRETE_PACKAGE.height),
    width: String(pkg?.width ?? DEFAULT_SUPERFRETE_PACKAGE.width),
    length: String(pkg?.length ?? DEFAULT_SUPERFRETE_PACKAGE.length),
  };
}

export function hasCompletePackageDimensions(inputs: PackageDimensionInputs): boolean {
  return (
    Number(inputs.weight) > 0 &&
    Number(inputs.height) > 0 &&
    Number(inputs.width) > 0 &&
    Number(inputs.length) > 0
  );
}

export function parsePackageDimensions(
  inputs: PackageDimensionInputs,
  fallback?: Partial<SuperfretePackage> | null,
): SuperfretePackage {
  const baseWeight = fallback?.weight ?? DEFAULT_SUPERFRETE_PACKAGE.weight;
  const baseHeight = fallback?.height ?? DEFAULT_SUPERFRETE_PACKAGE.height;
  const baseWidth = fallback?.width ?? DEFAULT_SUPERFRETE_PACKAGE.width;
  const baseLength = fallback?.length ?? DEFAULT_SUPERFRETE_PACKAGE.length;

  const w = Number(inputs.weight);
  const h = Number(inputs.height);
  const wi = Number(inputs.width);
  const l = Number(inputs.length);

  return {
    weight: Number.isFinite(w) && w > 0 ? w : baseWeight,
    height: Number.isFinite(h) && h > 0 ? h : baseHeight,
    width: Number.isFinite(wi) && wi > 0 ? wi : baseWidth,
    length: Number.isFinite(l) && l > 0 ? l : baseLength,
  };
}
