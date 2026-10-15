ALTER TYPE "public"."role" ADD VALUE 'student';--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "student_id" integer;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_student_key" ON "accounts" USING btree ("student_id");