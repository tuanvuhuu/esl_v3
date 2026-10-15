CREATE TABLE "teacher_campuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_id" integer NOT NULL,
	"campus_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teacher_campuses" ADD CONSTRAINT "teacher_campuses_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_campuses" ADD CONSTRAINT "teacher_campuses_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_campuses_pair_key" ON "teacher_campuses" USING btree ("teacher_id","campus_id");--> statement-breakpoint
CREATE INDEX "teacher_campuses_campus_idx" ON "teacher_campuses" USING btree ("campus_id");--> statement-breakpoint
-- Giáo viên hiện có được gắn với cơ sở mặc định (cơ sở đầu tiên). Không có cơ sở thì không có dòng nào được thêm.
INSERT INTO "teacher_campuses" ("teacher_id", "campus_id") SELECT t."id", c."id" FROM "teachers" t CROSS JOIN (SELECT "id" FROM "campuses" ORDER BY "id" LIMIT 1) c;
