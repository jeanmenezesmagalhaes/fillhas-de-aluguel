ALTER TABLE "servicos" ADD COLUMN "local" text;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "observacoes" text;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "proposta_inicio" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "proposta_horas" smallint;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "proposta_recado" text;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servico_proposta_completa" CHECK ("servicos"."situacao" <> 'proposta_alterada' or ("servicos"."proposta_inicio" is not null and "servicos"."proposta_horas" >= 1));