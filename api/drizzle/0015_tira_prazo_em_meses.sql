ALTER TABLE "convites" DROP CONSTRAINT "convite_meses_faixa";--> statement-breakpoint
ALTER TABLE "profissionais" DROP CONSTRAINT "taxa_especial_meses_faixa";--> statement-breakpoint
ALTER TABLE "convites" DROP COLUMN "taxa_meses";--> statement-breakpoint
ALTER TABLE "profissionais" DROP COLUMN "taxa_especial_meses";