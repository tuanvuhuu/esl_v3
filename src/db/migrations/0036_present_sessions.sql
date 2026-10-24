CREATE TABLE "present_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(32) NOT NULL,
	"account_id" integer NOT NULL,
	"source_kind" varchar(20) NOT NULL,
	"source_id" integer NOT NULL,
	"mode" varchar(10) DEFAULT 'flash' NOT NULL,
	"seed" integer NOT NULL,
	"total" integer NOT NULL,
	"slide" integer DEFAULT 0 NOT NULL,
	"revealed" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "present_sessions" ADD CONSTRAINT "present_sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "present_sessions_token_key" ON "present_sessions" USING btree ("token");