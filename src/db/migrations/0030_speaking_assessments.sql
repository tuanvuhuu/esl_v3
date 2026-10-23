CREATE TABLE "speaking_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"scale" varchar(10) NOT NULL,
	"pronunciation" integer,
	"fluency" integer,
	"task" integer,
	"vocabulary" integer,
	"grammar" integer,
	"praise" text DEFAULT '' NOT NULL,
	"graded_by_account_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "speaking_assessments" ADD CONSTRAINT "speaking_assessments_submission_id_assignment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."assignment_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_assessments" ADD CONSTRAINT "speaking_assessments_item_id_assignment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."assignment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_assessments" ADD CONSTRAINT "speaking_assessments_graded_by_account_id_accounts_id_fk" FOREIGN KEY ("graded_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "speaking_assessments_pair_key" ON "speaking_assessments" USING btree ("submission_id","item_id");