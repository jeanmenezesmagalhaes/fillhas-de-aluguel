CREATE TABLE "convites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"email" text,
	"celular" text,
	"mensagem" text,
	"taxa_percentual" smallint,
	"taxa_meses" smallint,
	"prioridade_fila" boolean DEFAULT false NOT NULL,
	"usos_maximos" smallint DEFAULT 1 NOT NULL,
	"usos" smallint DEFAULT 0 NOT NULL,
	"expira_em" timestamp with time zone,
	"observacao" text,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado_em" timestamp with time zone,
	"cancelado_em" timestamp with time zone,
	CONSTRAINT "convites_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "convite_taxa_faixa" CHECK ("convites"."taxa_percentual" is null or "convites"."taxa_percentual" between 0 and 100),
	CONSTRAINT "convite_meses_faixa" CHECK ("convites"."taxa_meses" is null or "convites"."taxa_meses" between 1 and 60),
	CONSTRAINT "convite_usos_faixa" CHECK ("convites"."usos_maximos" between 1 and 500 and "convites"."usos" between 0 and "convites"."usos_maximos")
);
--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "convite_id" uuid;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "taxa_especial_percentual" smallint;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "taxa_especial_meses" smallint;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "taxa_especial_ate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "prioridade_fila" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "convites" ADD CONSTRAINT "convites_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "convites_por_criacao" ON "convites" USING btree ("criado_em");--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_convite_id_convites_id_fk" FOREIGN KEY ("convite_id") REFERENCES "public"."convites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "taxa_especial_faixa" CHECK ("profissionais"."taxa_especial_percentual" is null or "profissionais"."taxa_especial_percentual" between 0 and 100);--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "taxa_especial_meses_faixa" CHECK ("profissionais"."taxa_especial_meses" is null or "profissionais"."taxa_especial_meses" between 1 and 60);