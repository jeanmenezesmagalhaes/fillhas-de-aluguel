-- Pacotes de convite: todo benefício passa a ter fim, em dias contados da aprovação, e a isenção
-- de cadastro ou mensalidade fica guardada. Convites e profissionais que já existem recebem os
-- termos do pacote Boas-vindas (o prazo antigo, em meses, vira dias).
ALTER TABLE "convites" DROP CONSTRAINT "convite_taxa_faixa";--> statement-breakpoint
ALTER TABLE "convites" ADD COLUMN "pacote" text DEFAULT 'boas_vindas' NOT NULL;--> statement-breakpoint
ALTER TABLE "convites" ADD COLUMN "taxa_dias" smallint;--> statement-breakpoint
ALTER TABLE "convites" ADD COLUMN "isencao_meses" smallint;--> statement-breakpoint
UPDATE "convites" SET "taxa_percentual" = coalesce("taxa_percentual", 6), "taxa_dias" = coalesce("taxa_meses" * 30, 90), "isencao_meses" = 6;--> statement-breakpoint
ALTER TABLE "convites" ALTER COLUMN "taxa_percentual" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "convites" ALTER COLUMN "taxa_dias" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "convites" ALTER COLUMN "isencao_meses" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "beneficio_pacote" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "taxa_especial_dias" smallint;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "isencao_meses" smallint;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "isencao_ate" timestamp with time zone;--> statement-breakpoint
UPDATE "profissionais" SET "beneficio_pacote" = 'boas_vindas', "taxa_especial_dias" = coalesce("taxa_especial_meses" * 30, 90), "isencao_meses" = 6 WHERE "taxa_especial_percentual" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "convites" ADD CONSTRAINT "convite_dias_faixa" CHECK ("convites"."taxa_dias" between 1 and 730);--> statement-breakpoint
ALTER TABLE "convites" ADD CONSTRAINT "convite_isencao_faixa" CHECK ("convites"."isencao_meses" between 1 and 36);--> statement-breakpoint
ALTER TABLE "convites" ADD CONSTRAINT "convite_pacote" CHECK ("convites"."pacote" in ('boas_vindas', 'parceria'));--> statement-breakpoint
ALTER TABLE "convites" ADD CONSTRAINT "convite_taxa_faixa" CHECK ("convites"."taxa_percentual" between 0 and 100);--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "taxa_especial_com_prazo" CHECK (("profissionais"."taxa_especial_percentual" is null) = ("profissionais"."taxa_especial_dias" is null));--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "taxa_especial_dias_faixa" CHECK ("profissionais"."taxa_especial_dias" is null or "profissionais"."taxa_especial_dias" between 1 and 730);--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "isencao_meses_faixa" CHECK ("profissionais"."isencao_meses" is null or "profissionais"."isencao_meses" between 1 and 36);
