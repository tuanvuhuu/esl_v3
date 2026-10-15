CREATE TYPE "public"."item_type" AS ENUM('choice', 'text', 'file');--> statement-breakpoint
CREATE TYPE "public"."skill" AS ENUM('listening', 'speaking', 'reading', 'writing');--> statement-breakpoint
CREATE TABLE "assignment_item_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"position" integer NOT NULL,
	"label" varchar(300) NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"position" integer NOT NULL,
	"skill" "skill" NOT NULL,
	"item_type" "item_type" NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"passage" text DEFAULT '' NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"audio_file_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_item_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"selected_option_id" integer,
	"answer_text" text DEFAULT '' NOT NULL,
	"file_id" integer,
	"points" integer,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"storage_key" varchar(64) NOT NULL,
	"original_name" varchar(200) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by_account_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_item_options" ADD CONSTRAINT "assignment_item_options_item_id_assignment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."assignment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD CONSTRAINT "assignment_items_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD CONSTRAINT "assignment_items_audio_file_id_uploaded_files_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_item_scores" ADD CONSTRAINT "submission_item_scores_submission_id_assignment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."assignment_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_item_scores" ADD CONSTRAINT "submission_item_scores_item_id_assignment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."assignment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_item_scores" ADD CONSTRAINT "submission_item_scores_selected_option_id_assignment_item_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."assignment_item_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_item_scores" ADD CONSTRAINT "submission_item_scores_file_id_uploaded_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_uploaded_by_account_id_accounts_id_fk" FOREIGN KEY ("uploaded_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_item_options_item_idx" ON "assignment_item_options" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "assignment_items_assignment_idx" ON "assignment_items" USING btree ("assignment_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_item_scores_pair_key" ON "submission_item_scores" USING btree ("submission_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uploaded_files_key" ON "uploaded_files" USING btree ("storage_key");