ALTER TYPE "public"."situacao_servico" ADD VALUE 'expirado';--> statement-breakpoint
CREATE TABLE "bloqueios_agenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profissional_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"motivo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bloqueio_periodo" CHECK ("bloqueios_agenda"."inicio" < "bloqueios_agenda"."fim")
);
--> statement-breakpoint
CREATE TABLE "disponibilidade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profissional_id" uuid NOT NULL,
	"dia" smallint NOT NULL,
	"inicio_min" smallint NOT NULL,
	"fim_min" smallint NOT NULL,
	CONSTRAINT "disponibilidade_dia" CHECK ("disponibilidade"."dia" between 0 and 6),
	CONSTRAINT "disponibilidade_faixa" CHECK ("disponibilidade"."inicio_min" >= 0 and "disponibilidade"."fim_min" <= 1440 and "disponibilidade"."inicio_min" < "disponibilidade"."fim_min")
);
--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "responda_ate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bloqueios_agenda" ADD CONSTRAINT "bloqueios_agenda_profissional_id_profissionais_usuario_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disponibilidade" ADD CONSTRAINT "disponibilidade_profissional_id_profissionais_usuario_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bloqueios_por_profissional" ON "bloqueios_agenda" USING btree ("profissional_id","inicio");--> statement-breakpoint
CREATE INDEX "disponibilidade_por_profissional" ON "disponibilidade" USING btree ("profissional_id","dia");