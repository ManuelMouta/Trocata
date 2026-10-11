/** Utilidades geográficas (Haversine + centróide). */

const R = 6371; // raio da Terra (km)

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Ponto {
  lat: number;
  lng: number;
}

export function centroide(pontos: Ponto[]): Ponto {
  const n = pontos.length || 1;
  return {
    lat: pontos.reduce((s, p) => s + p.lat, 0) / n,
    lng: pontos.reduce((s, p) => s + p.lng, 0) / n,
  };
}

/** Distância média de cada ponto ao centróide (km). */
export function distanciaMediaAoCentroide(pontos: Ponto[]): number {
  const c = centroide(pontos);
  const n = pontos.length || 1;
  return (
    pontos.reduce((s, p) => s + haversineKm(p.lat, p.lng, c.lat, c.lng), 0) / n
  );
}
