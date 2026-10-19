-- Migration 0016: Hỗ trợ các dạng câu hỏi mới cho bài tập online (P35)
-- Nghe chọn tranh, ghép đôi, sắp xếp, điền chỗ trống, nhắc lại, đọc to, nói theo tranh

ALTER TYPE "public"."item_type" ADD VALUE IF NOT EXISTS 'picture_choice';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE IF NOT EXISTS 'match';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE IF NOT EXISTS 'order';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE IF NOT EXISTS 'gap_fill';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE IF NOT EXISTS 'speak_repeat';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE IF NOT EXISTS 'speak_read';--> statement-breakpoint
ALTER TYPE "public"."item_type" ADD VALUE IF NOT EXISTS 'speak_picture';--> statement-breakpoint

ALTER TABLE "assignment_items" ADD COLUMN IF NOT EXISTS "image_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD COLUMN IF NOT EXISTS "model_audio_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD COLUMN IF NOT EXISTS "prompt_vi" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD COLUMN IF NOT EXISTS "reference_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD COLUMN IF NOT EXISTS "max_seconds" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_items" ADD COLUMN IF NOT EXISTS "source_license" varchar(300) DEFAULT '' NOT NULL;--> statement-breakpoint

ALTER TABLE "assignment_item_options" ADD COLUMN IF NOT EXISTS "image_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "assignment_item_options" ADD COLUMN IF NOT EXISTS "audio_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL;--> statement-breakpoint

ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "image_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "model_audio_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "prompt_vi" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "reference_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "max_seconds" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "source_license" varchar(300) DEFAULT '' NOT NULL;--> statement-breakpoint

ALTER TABLE "question_options" ADD COLUMN IF NOT EXISTS "image_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "question_options" ADD COLUMN IF NOT EXISTS "audio_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "assignment_item_pairs" (
  "id" serial PRIMARY KEY NOT NULL,
  "item_id" integer NOT NULL REFERENCES "assignment_items"("id") ON DELETE CASCADE,
  "position" integer NOT NULL,
  "left_label" varchar(300) NOT NULL,
  "left_image_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL,
  "right_label" varchar(300) NOT NULL,
  "right_image_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_item_pairs_item_idx" ON "assignment_item_pairs" USING btree ("item_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "question_pairs" (
  "id" serial PRIMARY KEY NOT NULL,
  "question_id" integer NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "position" integer NOT NULL,
  "left_label" varchar(300) NOT NULL,
  "left_image_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL,
  "right_label" varchar(300) NOT NULL,
  "right_image_file_id" integer REFERENCES "uploaded_files"("id") ON DELETE SET NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_pairs_question_idx" ON "question_pairs" USING btree ("question_id");
