ALTER TYPE "public"."tipo_documento" ADD VALUE 'cnh';--> statement-breakpoint
CREATE TABLE "qualificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profissional_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"instituicao" text NOT NULL,
	"carga_horaria_horas" smallint,
	"ano_conclusao" smallint,
	"arquivo_chave" text NOT NULL,
	"nome_original" text NOT NULL,
	"tipo_arquivo" text NOT NULL,
	"tamanho" integer NOT NULL,
	"sha256" text NOT NULL,
	"situacao" "situacao_documento" DEFAULT 'enviado' NOT NULL,
	"motivo_recusa" text,
	"enviado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"revisado_em" timestamp with time zone,
	"revisado_por" uuid,
	CONSTRAINT "qualificacoes_arquivo_chave_unique" UNIQUE("arquivo_chave"),
	CONSTRAINT "qualificacao_recusada_tem_motivo" CHECK ("qualificacoes"."situacao" <> 'recusado' or "qualificacoes"."motivo_recusa" is not null),
	CONSTRAINT "qualificacao_carga_horaria" CHECK ("qualificacoes"."carga_horaria_horas" is null or "qualificacoes"."carga_horaria_horas" between 1 and 5000),
	CONSTRAINT "qualificacao_ano" CHECK ("qualificacoes"."ano_conclusao" is null or "qualificacoes"."ano_conclusao" between 1950 and 2100)
);
--> statement-breakpoint
ALTER TABLE "qualificacoes" ADD CONSTRAINT "qualificacoes_profissional_id_profissionais_usuario_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualificacoes" ADD CONSTRAINT "qualificacoes_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qualificacoes_por_profissional" ON "qualificacoes" USING btree ("profissional_id","situacao");--> statement-breakpoint
CREATE INDEX "qualificacoes_pendentes" ON "qualificacoes" USING btree ("situacao","enviado_em");