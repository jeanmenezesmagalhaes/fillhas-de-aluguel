CREATE TYPE "public"."sentido_avaliacao" AS ENUM('familia_avalia_profissional', 'profissional_avalia_familia');--> statement-breakpoint
CREATE TYPE "public"."situacao_profissional" AS ENUM('rascunho', 'em_analise', 'aprovado', 'correcao', 'vencido');--> statement-breakpoint
CREATE TYPE "public"."situacao_servico" AS ENUM('solicitado', 'proposta_alterada', 'confirmado', 'recusado', 'cancelado', 'realizado');--> statement-breakpoint
CREATE TABLE "avaliacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servico_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"avaliado_id" uuid NOT NULL,
	"sentido" "sentido_avaliacao" NOT NULL,
	"nota" smallint NOT NULL,
	"comentario" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "avaliacao_nota_faixa" CHECK ("avaliacoes"."nota" between 1 and 5),
	CONSTRAINT "avaliacao_partes_distintas" CHECK ("avaliacoes"."autor_id" <> "avaliacoes"."avaliado_id")
);
--> statement-breakpoint
CREATE TABLE "contratantes" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pessoas_acompanhadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contratante_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"data_nascimento" date,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profissionais" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"cidade" text NOT NULL,
	"uf" text NOT NULL,
	"bairros" text[] DEFAULT '{}'::text[] NOT NULL,
	"apresentacao" text,
	"valor_hora_centavos" integer,
	"horas_minimas" smallint DEFAULT 1 NOT NULL,
	"veiculo_incluso" boolean DEFAULT false NOT NULL,
	"situacao" "situacao_profissional" DEFAULT 'rascunho' NOT NULL,
	"revisado_em" date,
	"proxima_revisao" date,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profissionais_slug_unique" UNIQUE("slug"),
	CONSTRAINT "valor_hora_minimo" CHECK ("profissionais"."valor_hora_centavos" is null or "profissionais"."valor_hora_centavos" >= 7000),
	CONSTRAINT "horas_minimas_faixa" CHECK ("profissionais"."horas_minimas" between 1 and 12),
	CONSTRAINT "uf_formato" CHECK ("profissionais"."uf" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contratante_id" uuid NOT NULL,
	"profissional_id" uuid NOT NULL,
	"pessoa_acompanhada_id" uuid,
	"tarefa" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"horas" smallint NOT NULL,
	"valor_hora_centavos" integer NOT NULL,
	"situacao" "situacao_servico" DEFAULT 'solicitado' NOT NULL,
	"realizado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "servico_horas_positivas" CHECK ("servicos"."horas" >= 1),
	CONSTRAINT "servico_partes_distintas" CHECK ("servicos"."contratante_id" <> "servicos"."profissional_id"),
	CONSTRAINT "servico_realizado_tem_data" CHECK (("servicos"."situacao" = 'realizado') = ("servicos"."realizado_em" is not null))
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	CONSTRAINT "sessoes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"nome" text NOT NULL,
	"celular" text NOT NULL,
	"admin" boolean DEFAULT false NOT NULL,
	"email_verificado_em" timestamp with time zone,
	"termos_aceitos_em" timestamp with time zone NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_avaliado_id_usuarios_id_fk" FOREIGN KEY ("avaliado_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratantes" ADD CONSTRAINT "contratantes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pessoas_acompanhadas" ADD CONSTRAINT "pessoas_acompanhadas_contratante_id_contratantes_usuario_id_fk" FOREIGN KEY ("contratante_id") REFERENCES "public"."contratantes"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_contratante_id_contratantes_usuario_id_fk" FOREIGN KEY ("contratante_id") REFERENCES "public"."contratantes"("usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_profissional_id_profissionais_usuario_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_pessoa_acompanhada_id_pessoas_acompanhadas_id_fk" FOREIGN KEY ("pessoa_acompanhada_id") REFERENCES "public"."pessoas_acompanhadas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "avaliacao_unica_por_sentido" ON "avaliacoes" USING btree ("servico_id","sentido");--> statement-breakpoint
CREATE INDEX "avaliacoes_por_avaliado" ON "avaliacoes" USING btree ("avaliado_id","sentido");--> statement-breakpoint
CREATE INDEX "pessoas_por_contratante" ON "pessoas_acompanhadas" USING btree ("contratante_id");--> statement-breakpoint
CREATE INDEX "profissionais_por_cidade" ON "profissionais" USING btree ("cidade","situacao");--> statement-breakpoint
CREATE INDEX "servicos_por_contratante" ON "servicos" USING btree ("contratante_id");--> statement-breakpoint
CREATE INDEX "servicos_por_profissional" ON "servicos" USING btree ("profissional_id");--> statement-breakpoint
CREATE INDEX "sessoes_por_usuario" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_unico" ON "usuarios" USING btree (lower("email"));