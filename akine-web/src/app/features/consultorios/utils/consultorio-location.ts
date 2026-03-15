export interface GeocodeHit {
  lat: string;
  lon: string;
  display_name?: string;
}

export async function fetchGeocode(query: string, limit = 5): Promise<GeocodeHit[]> {
  const endpoint = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&q=${encodeURIComponent(query)}`;
  const response = await fetch(endpoint, {
    headers: {
      'Accept-Language': 'es',
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo consultar el geocodificador');
  }

  return (await response.json()) as GeocodeHit[];
}

export function buildMapEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

export function buildMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
