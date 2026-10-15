CREATE TYPE "public"."staff_role" AS ENUM('teacher', 'foreign', 'assistant');--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "assistant_id" integer;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "foreign_teacher_id" integer;--> statement-breakpoint
ALTER TABLE "teachers" ADD COLUMN "staff_role" "staff_role" DEFAULT 'teacher' NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_assistant_id_teachers_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_foreign_teacher_id_teachers_id_fk" FOREIGN KEY ("foreign_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classes_assistant_idx" ON "classes" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "classes_foreign_idx" ON "classes" USING btree ("foreign_teacher_id");