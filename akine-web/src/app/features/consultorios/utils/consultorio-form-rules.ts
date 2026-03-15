import { AbstractControl, FormControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Consultorio } from '../models/consultorio.models';

const PHONE_PATTERN = /^[0-9+\-()\s]{6,30}$/;

export const trimmedRequiredValidator: ValidatorFn = (
  control: AbstractControl<string | null | undefined>,
): ValidationErrors | null => {
  const value = normalizeText(control.value);
  return value ? null : { required: true };
};

export const optionalCuitValidator: ValidatorFn = (
  control: AbstractControl<string | null | undefined>,
): ValidationErrors | null => {
  const value = normalizeText(control.value);
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 ? null : { cuit: true };
};

export const phoneValidator: ValidatorFn = (
  control: AbstractControl<string | null | undefined>,
): ValidationErrors | null => {
  const value = normalizeText(control.value);
  if (!value) return { required: true };
  return PHONE_PATTERN.test(value) ? null : { phone: true };
};

export const optionalPhoneValidator: ValidatorFn = (
  control: AbstractControl<string | null | undefined>,
): ValidationErrors | null => {
  const value = normalizeText(control.value);
  if (!value) return null;
  return PHONE_PATTERN.test(value) ? null : { phone: true };
};

export function decimalRangeValidator(min: number, max: number): ValidatorFn {
  return (control: AbstractControl<string | number | null | undefined>): ValidationErrors | null => {
    const raw = normalizeText(control.value);
    if (!raw) return null;
    const parsed = Number(raw.replace(',', '.'));
    if (Number.isNaN(parsed) || parsed < min || parsed > max) {
      return { decimalRange: true };
    }
    return null;
  };
}

export function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateControlValue(
  value: string | number | null | undefined,
  validators: ValidatorFn[],
): boolean {
  const control = new FormControl(value == null ? '' : String(value), {
    nonNullable: true,
    validators,
  });
  return control.valid;
}

export function hasCoordinates(consultorio: Partial<Consultorio>): boolean {
  return consultorio.mapLatitude != null && consultorio.mapLongitude != null;
}

export function hasDocumentVisibilityConfig(consultorio: Partial<Consultorio>): boolean {
  return [
    consultorio.documentShowAddress,
    consultorio.documentShowPhone,
    consultorio.documentShowEmail,
    consultorio.documentShowCuit,
    consultorio.documentShowLegalName,
    consultorio.documentShowLogo,
  ].some((value) => typeof value === 'boolean');
}

export function hasAtLeastOneVisibleDocumentField(consultorio: Partial<Consultorio>): boolean {
  return [
    consultorio.documentShowAddress,
    consultorio.documentShowPhone,
    consultorio.documentShowEmail,
    consultorio.documentShowCuit,
    consultorio.documentShowLegalName,
    consultorio.documentShowLogo,
  ].some((value) => value === true);
}

export function evaluateConsultorioBasicMissingItems(consultorio: Partial<Consultorio>): string[] {
  const missing: string[] = [];

  if (!validateControlValue(consultorio.name, [trimmedRequiredValidator])) {
    missing.push('nombre del consultorio');
  }

  if (!validateControlValue(consultorio.address, [trimmedRequiredValidator])) {
    missing.push('direccion completa');
  }

  if (!validateControlValue(consultorio.email, [trimmedRequiredValidator, Validators.email])) {
    missing.push('email valido');
  }

  if (!validateControlValue(consultorio.phone, [phoneValidator])) {
    missing.push('telefono valido');
  }

  if (!hasCoordinates(consultorio)) {
    missing.push('ubicacion en mapa');
  } else {
    if (!validateControlValue(consultorio.mapLatitude, [decimalRangeValidator(-90, 90)])) {
      missing.push('latitud valida');
    }
    if (!validateControlValue(consultorio.mapLongitude, [decimalRangeValidator(-180, 180)])) {
      missing.push('longitud valida');
    }
  }

  return missing;
}

export function evaluateConsultorioDocumentMissingItems(consultorio: Partial<Consultorio>): string[] {
  const missing: string[] = [];
  const visibleDocumentName = normalizeText(consultorio.documentDisplayName) || normalizeText(consultorio.name);

  if (!visibleDocumentName) {
    missing.push('nombre visible en documentos');
  }

  if (!hasDocumentVisibilityConfig(consultorio)) {
    missing.push('configuracion de visibilidad documental');
  }

  if (!hasAtLeastOneVisibleDocumentField(consultorio)) {
    missing.push('al menos 1 dato visible en documentos');
  }

  return missing;
}
