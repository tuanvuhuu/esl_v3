CREATE TYPE "public"."survey_continue" AS ENUM('yes', 'maybe', 'no');--> statement-breakpoint
CREATE TABLE "course_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"score" integer,
	"continue_choice" "survey_continue",
	"sent_by_account_id" integer,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_surveys" ADD CONSTRAINT "course_surveys_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_surveys" ADD CONSTRAINT "course_surveys_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_surveys" ADD CONSTRAINT "course_surveys_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_surveys" ADD CONSTRAINT "course_surveys_sent_by_account_id_accounts_id_fk" FOREIGN KEY ("sent_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_surveys_class_student_parent_key" ON "course_surveys" USING btree ("class_id","student_id","parent_id");--> statement-breakpoint
CREATE INDEX "course_surveys_class_idx" ON "course_surveys" USING btree ("class_id");