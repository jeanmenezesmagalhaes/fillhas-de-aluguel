CREATE TYPE "public"."situacao_pagamento" AS ENUM('pendente', 'pago', 'reembolsado');--> statement-breakpoint
CREATE TYPE "public"."situacao_repasse" AS ENUM('aguardando', 'enviando', 'enviado', 'falhou');--> statement-breakpoint
CREATE TYPE "public"."tipo_chave_pix" AS ENUM('CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM');--> statement-breakpoint
ALTER TYPE "public"."situacao_servico" ADD VALUE 'aguardando_pagamento' BEFORE 'confirmado';--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servico_id" uuid NOT NULL,
	"gateway" text NOT NULL,
	"cobranca_id" text NOT NULL,
	"url" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"situacao" "situacao_pagamento" DEFAULT 'pendente' NOT NULL,
	"metodo" text,
	"parcelas" smallint,
	"acrescimo_centavos" integer,
	"taxa_gateway_centavos" integer,
	"comprovante_url" text,
	"pago_em" timestamp with time zone,
	"reembolsado_em" timestamp with time zone,
	"reembolso_erro" text,
	"repasse_situacao" "situacao_repasse" DEFAULT 'aguardando' NOT NULL,
	"repasse_valor_centavos" integer,
	"repasse_id" text,
	"repasse_comprovante_url" text,
	"repasse_erro" text,
	"repassado_em" timestamp with time zone,
	"repassado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagamentos_servico_id_unique" UNIQUE("servico_id"),
	CONSTRAINT "pagamentos_cobranca_id_unique" UNIQUE("cobranca_id"),
	CONSTRAINT "pagamento_valor_positivo" CHECK ("pagamentos"."valor_centavos" > 0),
	CONSTRAINT "pagamento_pago_tem_data" CHECK ("pagamentos"."situacao" = 'pendente' or "pagamentos"."pago_em" is not null)
);
--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "chave_pix" text;--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "tipo_chave_pix" "tipo_chave_pix";--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_repassado_por_usuarios_id_fk" FOREIGN KEY ("repassado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pagamentos_por_situacao" ON "pagamentos" USING btree ("situacao","repasse_situacao");--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "chave_pix_completa" CHECK (("profissionais"."chave_pix" is null) = ("profissionais"."tipo_chave_pix" is null));