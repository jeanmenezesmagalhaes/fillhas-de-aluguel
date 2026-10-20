CREATE TYPE "public"."tipo_tarefa" AS ENUM('consulta', 'banco', 'mercado', 'passeio', 'personalizada');--> statement-breakpoint
CREATE TABLE "tarefas_profissional" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profissional_id" uuid NOT NULL,
	"tipo" "tipo_tarefa" NOT NULL,
	"nome" text,
	"minimo_horas" smallint NOT NULL,
	"ordem" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "tarefa_minimo_faixa" CHECK ("tarefas_profissional"."minimo_horas" between 1 and 12),
	CONSTRAINT "tarefa_nome_personalizada" CHECK (("tarefas_profissional"."tipo" = 'personalizada') = ("tarefas_profissional"."nome" is not null))
);
--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "aceita_outras" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "servicos" ADD COLUMN "tipo_tarefa" text;--> statement-breakpoint
ALTER TABLE "tarefas_profissional" ADD CONSTRAINT "tarefas_profissional_profissional_id_profissionais_usuario_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tarefa_fixa_unica" ON "tarefas_profissional" USING btree ("profissional_id","tipo") WHERE "tarefas_profissional"."tipo" <> 'personalizada';--> statement-breakpoint
CREATE UNIQUE INDEX "tarefa_personalizada_unica" ON "tarefas_profissional" USING btree ("profissional_id",lower("nome")) WHERE "tarefas_profissional"."tipo" = 'personalizada';--> statement-breakpoint
CREATE INDEX "tarefas_por_tipo" ON "tarefas_profissional" USING btree ("tipo");