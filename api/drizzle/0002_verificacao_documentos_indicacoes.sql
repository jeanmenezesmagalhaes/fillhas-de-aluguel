CREATE TYPE "public"."canal_verificacao" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."situacao_documento" AS ENUM('enviado', 'aprovado', 'recusado', 'substituido');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('documento_identidade', 'comprovante_endereco', 'cartao_cnpj');--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profissional_id" uuid NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
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
	CONSTRAINT "documentos_arquivo_chave_unique" UNIQUE("arquivo_chave"),
	CONSTRAINT "documento_recusado_tem_motivo" CHECK ("documentos"."situacao" <> 'recusado' or "documentos"."motivo_recusa" is not null)
);
--> statement-breakpoint
CREATE TABLE "indicacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicador_id" uuid NOT NULL,
	"indicado_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"aprovado_em" timestamp with time zone,
	"primeiro_servico_em" timestamp with time zone,
	CONSTRAINT "indicacoes_indicado_id_unique" UNIQUE("indicado_id"),
	CONSTRAINT "indicacao_sem_autoindicacao" CHECK ("indicacoes"."indicador_id" <> "indicacoes"."indicado_id")
);
--> statement-breakpoint
CREATE TABLE "verificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"canal" "canal_verificacao" NOT NULL,
	"destino" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"tentativas" smallint DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"confirmado_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "cpf" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "cnpj" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "razao_social" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "cep" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "logradouro" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "numero" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "complemento" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "bairro" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "endereco_cidade" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "endereco_uf" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "enviado_analise_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "motivo_correcao" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "aprovado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "aprovado_por" uuid;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "celular_verificado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "codigo_indicacao" text;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_profissional_id_profissionais_usuario_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_indicador_id_usuarios_id_fk" FOREIGN KEY ("indicador_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_indicado_id_usuarios_id_fk" FOREIGN KEY ("indicado_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificacoes" ADD CONSTRAINT "verificacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documentos_por_profissional" ON "documentos" USING btree ("profissional_id","tipo");--> statement-breakpoint
CREATE INDEX "indicacoes_por_indicador" ON "indicacoes" USING btree ("indicador_id");--> statement-breakpoint
CREATE INDEX "verificacoes_por_usuario" ON "verificacoes" USING btree ("usuario_id","canal","criado_em");--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_aprovado_por_usuarios_id_fk" FOREIGN KEY ("aprovado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profissionais_fila" ON "profissionais" USING btree ("situacao","enviado_analise_em");--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_cpf_unique" UNIQUE("cpf");--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_codigo_indicacao_unique" UNIQUE("codigo_indicacao");--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "cpf_formato" CHECK ("profissionais"."cpf" is null or "profissionais"."cpf" ~ '^[0-9]{11}$');--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "cnpj_formato" CHECK ("profissionais"."cnpj" is null or "profissionais"."cnpj" ~ '^[0-9]{14}$');--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "cep_formato" CHECK ("profissionais"."cep" is null or "profissionais"."cep" ~ '^[0-9]{8}$');