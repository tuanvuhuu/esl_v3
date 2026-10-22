CREATE TYPE "public"."consent_purpose" AS ENUM('voice_teacher_review', 'voice_auto_scoring');--> statement-breakpoint
CREATE TABLE "parent_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"granted" boolean NOT NULL,
	"parent_id" integer,
	"channel" varchar(20) NOT NULL,
	"terms_version" varchar(20) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"child_agreed_at" timestamp with time zone,
	"recorded_by_account_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parent_consents" ADD CONSTRAINT "parent_consents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_consents" ADD CONSTRAINT "parent_consents_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_consents" ADD CONSTRAINT "parent_consents_recorded_by_account_id_accounts_id_fk" FOREIGN KEY ("recorded_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parent_consents_student_idx" ON "parent_consents" USING btree ("student_id","purpose");