CREATE TABLE "word_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"word_key" varchar(60) NOT NULL,
	"word" varchar(60) NOT NULL,
	"meaning_vi" varchar(120) DEFAULT '' NOT NULL,
	"emoji" varchar(16) DEFAULT '' NOT NULL,
	"image_file_id" integer,
	"audio_file_id" integer,
	"word_list_id" integer,
	"card" jsonb NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word_reviews" ADD CONSTRAINT "word_reviews_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_reviews" ADD CONSTRAINT "word_reviews_image_file_id_uploaded_files_id_fk" FOREIGN KEY ("image_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_reviews" ADD CONSTRAINT "word_reviews_audio_file_id_uploaded_files_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_reviews" ADD CONSTRAINT "word_reviews_word_list_id_word_lists_id_fk" FOREIGN KEY ("word_list_id") REFERENCES "public"."word_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "word_reviews_student_word_key" ON "word_reviews" USING btree ("student_id","word_key");--> statement-breakpoint
CREATE INDEX "word_reviews_due_idx" ON "word_reviews" USING btree ("student_id","due");