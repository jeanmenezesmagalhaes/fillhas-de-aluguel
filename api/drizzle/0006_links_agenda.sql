CREATE TABLE "links_agenda" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"versao" integer DEFAULT 1 NOT NULL,
	"token_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_agenda_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "links_agenda" ADD CONSTRAINT "links_agenda_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;