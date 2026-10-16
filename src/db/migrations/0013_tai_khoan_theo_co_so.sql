CREATE TABLE "account_campuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"campus_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_campuses" ADD CONSTRAINT "account_campuses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_campuses" ADD CONSTRAINT "account_campuses_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_campuses_pair_key" ON "account_campuses" USING btree ("account_id","campus_id");--> statement-breakpoint
CREATE INDEX "account_campuses_campus_idx" ON "account_campuses" USING btree ("campus_id");--> statement-breakpoint
-- Dữ liệu ban đầu: tài khoản giáo viên làm việc ở các cơ sở giáo viên đó dạy
INSERT INTO "account_campuses" ("account_id", "campus_id") SELECT a."id", tc."campus_id" FROM "accounts" a JOIN "teacher_campuses" tc ON tc."teacher_id" = a."teacher_id" WHERE a."role" = 'teacher' ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Giáo vụ, kế toán (và giáo viên chưa gắn hồ sơ giáo viên) giữ quyền xem mọi cơ sở như trước, quản trị chỉnh lại sau
INSERT INTO "account_campuses" ("account_id", "campus_id") SELECT a."id", c."id" FROM "accounts" a CROSS JOIN "campuses" c WHERE a."role" IN ('academic', 'accountant') OR (a."role" = 'teacher' AND a."teacher_id" IS NULL) ON CONFLICT DO NOTHING;
