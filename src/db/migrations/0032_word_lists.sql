CREATE TABLE "word_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"position" integer NOT NULL,
	"word" varchar(60) NOT NULL,
	"meaning_vi" varchar(120) DEFAULT '' NOT NULL,
	"emoji" varchar(16) DEFAULT '' NOT NULL,
	"image_file_id" integer,
	"audio_file_id" integer,
	"vocab_item_id" integer
);
--> statement-breakpoint
CREATE TABLE "word_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"class_id" integer,
	"lesson_id" integer,
	"created_by_account_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_list_id_word_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."word_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_image_file_id_uploaded_files_id_fk" FOREIGN KEY ("image_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_audio_file_id_uploaded_files_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_vocab_item_id_vocab_items_id_fk" FOREIGN KEY ("vocab_item_id") REFERENCES "public"."vocab_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_lists" ADD CONSTRAINT "word_lists_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_lists" ADD CONSTRAINT "word_lists_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_lists" ADD CONSTRAINT "word_lists_created_by_account_id_accounts_id_fk" FOREIGN KEY ("created_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "word_list_items_list_idx" ON "word_list_items" USING btree ("list_id","position");--> statement-breakpoint
CREATE INDEX "word_lists_class_idx" ON "word_lists" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "word_lists_lesson_idx" ON "word_lists" USING btree ("lesson_id");