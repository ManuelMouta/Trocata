import { sair } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { EmBreve } from "@/components/features/em-breve";

export default function PerfilPage() {
  return (
    <div className="space-y-6">
      <EmBreve titulo="O meu Perfil" />
      <form action={sair} className="mx-auto max-w-xs">
        <Button type="submit" variant="outline" block>
          Terminar sessão
        </Button>
      </form>
    </div>
  );
}
