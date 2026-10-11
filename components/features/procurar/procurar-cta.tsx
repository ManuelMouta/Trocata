"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { iniciarProcura } from "@/app/actions/pools";

export function ProcurarCTA() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function procurar() {
    setLoading(true);
    setErro(null);
    const res = await iniciarProcura();
    if (res.requestId) {
      router.push(`/procurar/processamento?req=${res.requestId}`);
    } else {
      setErro(res.error ?? "Não foi possível iniciar a procura");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="primary"
        size="lg"
        block
        loading={loading}
        onClick={procurar}
        className="h-auto flex-col py-4"
      >
        <span className="flex items-center gap-2 text-lg">
          <Search className="size-5" /> Procurar Pool
        </span>
        <span className="text-xs font-normal opacity-90">
          Isto pode levar alguns segundos...
        </span>
      </Button>
      {erro && (
        <p role="alert" className="text-center text-sm text-danger">
          {erro}
        </p>
      )}
    </div>
  );
}
