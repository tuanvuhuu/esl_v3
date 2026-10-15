CREATE TABLE "campuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"address" varchar(200) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "campuses_name_key" ON "campuses" USING btree ("name");--> statement-breakpoint
-- Dữ liệu cũ: tạo một cơ sở mặc định, địa chỉ lấy từ Cài đặt trung tâm
INSERT INTO "campuses" ("name", "address") VALUES ('Cơ sở chính', COALESCE((SELECT "address" FROM "center_settings" WHERE "id" = 1), ''));--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "campus_id" integer;--> statement-breakpoint
-- Mọi lớp hiện có chuyển vào cơ sở mặc định, rồi mới bắt buộc có cơ sở
UPDATE "classes" SET "campus_id" = (SELECT "id" FROM "campuses" ORDER BY "id" LIMIT 1);--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "campus_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
DROP INDEX "classes_name_key";--> statement-breakpoint
CREATE UNIQUE INDEX "classes_campus_name_key" ON "classes" USING btree ("campus_id","name");
