CREATE TABLE "speaking_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"at_ms" integer NOT NULL,
	"error_type" varchar(30) NOT NULL,
	"correct_text" varchar(200) DEFAULT '' NOT NULL,
	"note" varchar(300) DEFAULT '' NOT NULL,
	"redo" boolean DEFAULT false NOT NULL,
	"created_by_account_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "speaking_feedback" ADD CONSTRAINT "speaking_feedback_submission_id_assignment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."assignment_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_feedback" ADD CONSTRAINT "speaking_feedback_item_id_assignment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."assignment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_feedback" ADD CONSTRAINT "speaking_feedback_created_by_account_id_accounts_id_fk" FOREIGN KEY ("created_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "speaking_feedback_submission_item_idx" ON "speaking_feedback" USING btree ("submission_id","item_id","at_ms");