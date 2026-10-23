CREATE TABLE "tentativas" (
	"chave" text PRIMARY KEY NOT NULL,
	"contagem" integer NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profissionais" ADD COLUMN "chave_pix_alterada_em" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "tentativas_por_expiracao" ON "tentativas" USING btree ("expira_em");