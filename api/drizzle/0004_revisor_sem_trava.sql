ALTER TABLE "documentos" DROP CONSTRAINT "documentos_revisado_por_usuarios_id_fk";
--> statement-breakpoint
ALTER TABLE "profissionais" DROP CONSTRAINT "profissionais_aprovado_por_usuarios_id_fk";
--> statement-breakpoint
ALTER TABLE "qualificacoes" DROP CONSTRAINT "qualificacoes_revisado_por_usuarios_id_fk";
--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_aprovado_por_usuarios_id_fk" FOREIGN KEY ("aprovado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualificacoes" ADD CONSTRAINT "qualificacoes_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;