ALTER TABLE "avaliacoes" ADD COLUMN "resposta" text;--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD COLUMN "respondido_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pessoas_acompanhadas" ADD COLUMN "parentesco" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "desconto_a_partir_horas" smallint;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "valor_hora_desconto_centavos" integer;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "anos_experiencia" smallint;--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "desconto_completo" CHECK (("profissionais"."desconto_a_partir_horas" is null) = ("profissionais"."valor_hora_desconto_centavos" is null));--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "desconto_faixa" CHECK ("profissionais"."desconto_a_partir_horas" is null or "profissionais"."desconto_a_partir_horas" between 2 and 12);--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "desconto_valor_minimo" CHECK ("profissionais"."valor_hora_desconto_centavos" is null or "profissionais"."valor_hora_desconto_centavos" >= 7000);--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "desconto_menor_que_hora" CHECK ("profissionais"."valor_hora_desconto_centavos" is null or "profissionais"."valor_hora_desconto_centavos" < "profissionais"."valor_hora_centavos");--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "anos_experiencia_faixa" CHECK ("profissionais"."anos_experiencia" is null or "profissionais"."anos_experiencia" between 0 and 60);