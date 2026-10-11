"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RaioSlider, type Raio } from "@/components/features/registo/raio-slider";
import { guardarLocalizacao, type ActionState } from "@/app/actions/auth";
import type { LatLng } from "@/components/features/registo/map-canvas";

// Mapa só no cliente (react-leaflet não suporta SSR).
const MapCanvas = dynamic(
  () => import("@/components/features/registo/map-canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-card bg-muted text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    ),
  },
);

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const LISBOA: LatLng = { lat: 38.7223, lng: -9.1393 };

interface Props {
  initial?: {
    lat: number;
    lng: number;
    localidade: string;
    raioKm: number;
  } | null;
}

export function LocationPicker({ initial }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    guardarLocalizacao,
    {},
  );

  const [pos, setPos] = useState<LatLng>(
    initial ? { lat: initial.lat, lng: initial.lng } : LISBOA,
  );
  const [localidade, setLocalidade] = useState(initial?.localidade ?? "");
  const [raio, setRaio] = useState<Raio>((initial?.raioKm as Raio) ?? 15);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autocomplete Nominatim (debounce 500ms, respeita rate limit).
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pt&limit=5&accept-language=pt&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
          setResults(await res.json());
          setOpen(true);
        }
      } catch {
        // silencioso — o utilizador pode ajustar no mapa
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  function pick(r: NominatimResult) {
    setPos({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    // primeira parte do display_name como localidade curta
    setLocalidade(r.display_name.split(",")[0]);
    setQuery(r.display_name.split(",").slice(0, 2).join(",").trim());
    setOpen(false);
  }

  const podeAvancar = useMemo(
    () => localidade.trim().length > 0,
    [localidade],
  );

  return (
    <form action={formAction} className="space-y-5">
      {/* Pesquisa de localidade */}
      <div className="relative">
        <label htmlFor="localidade-search" className="mb-1.5 block text-sm font-medium text-navy">
          Procurar localidade
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="localidade-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Ex: Amadora, Porto, Coimbra..."
            className="pl-9"
            autoComplete="off"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {open && results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-card border border-border bg-card shadow-card">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mapa */}
      <div>
        <MapCanvas position={pos} raioKm={raio} onChange={setPos} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Toca no mapa ou arrasta o marcador para ajustar. A área a verde é o teu
          raio de procura.
        </p>
      </div>

      {/* Localidade escolhida (editável) */}
      <div className="space-y-1.5">
        <label htmlFor="localidade" className="block text-sm font-medium text-navy">
          A tua localidade
        </label>
        <Input
          id="localidade"
          name="localidade"
          value={localidade}
          onChange={(e) => setLocalidade(e.target.value)}
          placeholder="Confirma o nome da tua zona"
        />
      </div>

      {/* Raio */}
      <RaioSlider value={raio} onChange={setRaio} label="Distância máxima" />

      {/* Campos ocultos */}
      <input type="hidden" name="lat" value={pos.lat} />
      <input type="hidden" name="lng" value={pos.lng} />
      <input type="hidden" name="raioKm" value={raio} />

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        loading={pending}
        disabled={!podeAvancar}
      >
        Continuar
      </Button>
    </form>
  );
}
