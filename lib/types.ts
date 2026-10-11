/** Tipos de domínio partilhados. */

export type EstadoUtilizador = "novo" | "activo" | "em_pool" | "inactivo";

export interface Utilizador {
  id: string;
  nome: string;
  email: string;
  telemovel: string | null;
  localidade: string | null;
  raio_km: number;
  estado: EstadoUtilizador;
  repetidos_cache: number[];
  faltas_cache: number[];
  registo_completo: boolean;
  /** true quando localizacao (point) não é null — devolvido por RPC/coluna auxiliar. */
  tem_localizacao?: boolean;
}

export type TipoCromo = "jogador" | "escudo" | "especial";

export interface Cromo {
  id: number;
  ordem: number;
  numero: string;
  nome: string;
  equipa: string;
  tipo: TipoCromo;
  /** Foto real do jogador (Wikimedia Commons), quando encontrada — ver scripts/fetch-fotos-jogadores.ts */
  imagem_url?: string | null;
}
