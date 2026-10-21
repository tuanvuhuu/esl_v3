-- P36.1: trình độ Pre-A1 cho lớp thiếu nhi, đứng trước A1. Tên theo kỳ thi Cambridge thiếu nhi để phụ huynh dễ hiểu.
-- Chỉ đổi tên A1, A2 khi tên còn là mặc định (tên sửa được trong Cài đặt, không ghi đè tên trung tâm đã đặt).
INSERT INTO "course_levels" ("code", "name", "sort") VALUES ('Pre-A1', 'Starters', 0) ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "course_levels" SET "name" = 'Movers', "updated_at" = now() WHERE "code" = 'A1' AND "name" = 'Sơ cấp A1';--> statement-breakpoint
UPDATE "course_levels" SET "name" = 'Flyers', "updated_at" = now() WHERE "code" = 'A2' AND "name" = 'Sơ cấp A2';--> statement-breakpoint
INSERT INTO "level_thresholds" ("level_id", "skill", "min_percent") SELECT l.id, s.skill::"skill", 70 FROM "course_levels" l CROSS JOIN (VALUES ('listening'), ('speaking'), ('reading'), ('writing')) AS s(skill) WHERE l.code = 'Pre-A1' ON CONFLICT DO NOTHING;
