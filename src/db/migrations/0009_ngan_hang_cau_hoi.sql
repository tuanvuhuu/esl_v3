CREATE TABLE "question_criteria" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"position" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"max_points" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"position" integer NOT NULL,
	"label" varchar(300) NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"skill" "skill" NOT NULL,
	"item_type" "item_type" NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"passage" text DEFAULT '' NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"audio_file_id" integer,
	"created_by_account_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_items" ADD COLUMN "bank_question_id" integer;--> statement-breakpoint
ALTER TABLE "question_criteria" ADD CONSTRAINT "question_criteria_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_audio_file_id_uploaded_files_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_account_id_accounts_id_fk" FOREIGN KEY ("created_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_criteria_question_idx" ON "question_criteria" USING btree ("question_id","position");--> statement-breakpoint
CREATE INDEX "question_options_question_idx" ON "question_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "questions_skill_idx" ON "questions" USING btree ("skill");--> statement-breakpoint
ALTER TABLE "assignment_items" ADD CONSTRAINT "assignment_items_bank_question_id_questions_id_fk" FOREIGN KEY ("bank_question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_items_bank_idx" ON "assignment_items" USING btree ("bank_question_id");