CREATE TABLE "assignment_item_criteria" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"position" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"max_points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_criterion_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"criterion_id" integer NOT NULL,
	"points" integer,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_second_marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"grader_account_id" integer,
	"points" integer NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment_item_criteria" ADD CONSTRAINT "assignment_item_criteria_item_id_assignment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."assignment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_criterion_scores" ADD CONSTRAINT "submission_criterion_scores_submission_id_assignment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."assignment_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_criterion_scores" ADD CONSTRAINT "submission_criterion_scores_criterion_id_assignment_item_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."assignment_item_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_second_marks" ADD CONSTRAINT "submission_second_marks_submission_id_assignment_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."assignment_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_second_marks" ADD CONSTRAINT "submission_second_marks_item_id_assignment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."assignment_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_second_marks" ADD CONSTRAINT "submission_second_marks_grader_account_id_accounts_id_fk" FOREIGN KEY ("grader_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_item_criteria_item_idx" ON "assignment_item_criteria" USING btree ("item_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_criterion_scores_pair_key" ON "submission_criterion_scores" USING btree ("submission_id","criterion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_second_marks_pair_key" ON "submission_second_marks" USING btree ("submission_id","item_id");