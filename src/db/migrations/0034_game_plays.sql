CREATE TABLE "game_plays" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"word_list_id" integer NOT NULL,
	"game" varchar(20) NOT NULL,
	"correct" integer NOT NULL,
	"total" integer NOT NULL,
	"stars" integer NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_plays" ADD CONSTRAINT "game_plays_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_plays" ADD CONSTRAINT "game_plays_word_list_id_word_lists_id_fk" FOREIGN KEY ("word_list_id") REFERENCES "public"."word_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_plays_student_idx" ON "game_plays" USING btree ("student_id","played_at");