import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        repetido: "bg-primary-50 text-primary-700",
        falta: "bg-red-50 text-danger",
        confirmado: "bg-primary-50 text-primary-700",
        pendente: "bg-orange-50 text-alert",
        especial: "bg-gold-50 text-gold-700",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

// cores usadas pelas variantes que não existem por token — declaradas via arbitrary abaixo
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
