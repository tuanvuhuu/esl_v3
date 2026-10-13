CREATE TYPE "public"."account_status" AS ENUM('active', 'locked');--> statement-breakpoint
CREATE TYPE "public"."attendance_mark" AS ENUM('present', 'late', 'absent');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'academic', 'teacher', 'accountant');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('active', 'trial', 'paused', 'finished');--> statement-breakpoint
CREATE TYPE "public"."teacher_status" AS ENUM('active', 'leave');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"role" "role" NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"session_date" date NOT NULL,
	"mark" "attendance_mark" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "center_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"center_name" varchar(120) NOT NULL,
	"address" varchar(200) DEFAULT '' NOT NULL,
	"hotline" varchar(20) DEFAULT '' NOT NULL,
	"email" varchar(160) DEFAULT '' NOT NULL,
	"working_hours" varchar(200) DEFAULT '' NOT NULL,
	"due_day" integer DEFAULT 10 NOT NULL,
	"late_fee_percent" integer DEFAULT 5 NOT NULL,
	"currency" varchar(10) DEFAULT 'VND' NOT NULL,
	"notify_sms_before_due" boolean DEFAULT true NOT NULL,
	"notify_weekly_report" boolean DEFAULT true NOT NULL,
	"notify_absent_alert" boolean DEFAULT true NOT NULL,
	"notify_new_class" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(40) NOT NULL,
	"course" varchar(120) NOT NULL,
	"teacher_id" integer NOT NULL,
	"schedule" varchar(120) DEFAULT '' NOT NULL,
	"sessions_total" integer NOT NULL,
	"fee" integer NOT NULL,
	"room" varchar(40) DEFAULT '' NOT NULL,
	"capacity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"gender" "gender" NOT NULL,
	"dob" date NOT NULL,
	"parent_name" varchar(120) DEFAULT '' NOT NULL,
	"phone" varchar(20) NOT NULL,
	"class_id" integer NOT NULL,
	"status" "student_status" DEFAULT 'trial' NOT NULL,
	"start_date" date NOT NULL,
	"sessions_done" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"subject" varchar(80) NOT NULL,
	"phone" varchar(20) DEFAULT '' NOT NULL,
	"years" integer DEFAULT 0 NOT NULL,
	"status" "teacher_status" DEFAULT 'active' NOT NULL,
	"avatar_tone" varchar(20) DEFAULT 'mint' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tuition_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" varchar(200) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tuition_payments" ADD CONSTRAINT "tuition_payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_student_date_key" ON "attendance" USING btree ("student_id","session_date");--> statement-breakpoint
CREATE UNIQUE INDEX "classes_name_key" ON "classes" USING btree ("name");--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "students_class_idx" ON "students" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "students_status_idx" ON "students" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tuition_payments_student_idx" ON "tuition_payments" USING btree ("student_id");