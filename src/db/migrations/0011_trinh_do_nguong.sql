CREATE TABLE "course_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(80) NOT NULL,
	"sort" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_thresholds" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"skill" "skill" NOT NULL,
	"min_percent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "level_id" integer;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "level_id" integer;--> statement-breakpoint
ALTER TABLE "level_thresholds" ADD CONSTRAINT "level_thresholds_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_levels_code_key" ON "course_levels" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "level_thresholds_pair_key" ON "level_thresholds" USING btree ("level_id","skill");--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_level_id_course_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."course_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Trình độ mặc định A1–C2 (sửa tên được trong Cài đặt). Ngưỡng 70% cho các trình độ từ A1 đến C1; C2 là cao nhất nên không có ngưỡng.
INSERT INTO "course_levels" ("code", "name", "sort") VALUES ('A1', 'Sơ cấp A1', 1), ('A2', 'Sơ cấp A2', 2), ('B1', 'Trung cấp B1', 3), ('B2', 'Trung cấp B2', 4), ('C1', 'Nâng cao C1', 5), ('C2', 'Thành thạo C2', 6) ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "level_thresholds" ("level_id", "skill", "min_percent") SELECT l.id, s.skill::"skill", 70 FROM "course_levels" l CROSS JOIN (VALUES ('listening'), ('speaking'), ('reading'), ('writing')) AS s(skill) WHERE l.code IN ('A1', 'A2', 'B1', 'B2', 'C1') ON CONFLICT DO NOTHING;
