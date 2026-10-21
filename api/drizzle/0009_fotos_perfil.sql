CREATE TABLE "fotos_perfil" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profissional_id" uuid NOT NULL,
	"arquivo_chave" text NOT NULL,
	"tipo_arquivo" text NOT NULL,
	"largura" integer NOT NULL,
	"altura" integer NOT NULL,
	"tamanho" integer NOT NULL,
	"situacao" "situacao_documento" DEFAULT 'enviado' NOT NULL,
	"motivo_recusa" text,
	"enviado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"revisado_em" timestamp with time zone,
	"revisado_por" uuid,
	CONSTRAINT "fotos_perfil_arquivo_chave_unique" UNIQUE("arquivo_chave"),
	CONSTRAINT "foto_recusada_tem_motivo" CHECK ("fotos_perfil"."situacao" <> 'recusado' or "fotos_perfil"."motivo_recusa" is not null)
);
--> statement-breakpoint
ALTER TABLE "fotos_perfil" ADD CONSTRAINT "fotos_perfil_profissional_id_profissionais_usuario_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos_perfil" ADD CONSTRAINT "fotos_perfil_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fotos_por_profissional" ON "fotos_perfil" USING btree ("profissional_id","situacao");