export type PoliticaNoShow = 'NO_COBRAR' | 'COBRAR_TOTAL' | 'COBRAR_PORCENTAJE';

export interface ConfiguracionConsultorio {
  id?: string;
  consultorioId: string;
  politicaNoShow: PoliticaNoShow;
  noShowHorasAviso?: number;
  alertaSesionSinCierreHoras: number;
  formatoNumeracionRecibo: string;
  habilitarMultiplesCajas: boolean;
  monedaDefault: string;
  arancelParticularPorSesion?: number;
}

export interface ConfiguracionConsultorioRequest {
  politicaNoShow: PoliticaNoShow;
  noShowHorasAviso?: number;
  alertaSesionSinCierreHoras: number;
  formatoNumeracionRecibo: string;
  habilitarMultiplesCajas: boolean;
  monedaDefault: string;
  arancelParticularPorSesion?: number;
}
