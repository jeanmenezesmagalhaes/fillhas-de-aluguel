ALTER TABLE "servicos" ADD COLUMN "valor_hora_cheio_centavos" integer;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "cancelado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "cancelado_por" text;