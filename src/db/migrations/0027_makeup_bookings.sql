CREATE TABLE "makeup_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"leave_request_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"booked_by_account_id" integer,
	"booked_by_parent_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "makeup_bookings" ADD CONSTRAINT "makeup_bookings_leave_request_id_leave_requests_id_fk" FOREIGN KEY ("leave_request_id") REFERENCES "public"."leave_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "makeup_bookings" ADD CONSTRAINT "makeup_bookings_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "makeup_bookings" ADD CONSTRAINT "makeup_bookings_session_id_class_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."class_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "makeup_bookings" ADD CONSTRAINT "makeup_bookings_booked_by_account_id_accounts_id_fk" FOREIGN KEY ("booked_by_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "makeup_bookings" ADD CONSTRAINT "makeup_bookings_booked_by_parent_id_parents_id_fk" FOREIGN KEY ("booked_by_parent_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "makeup_bookings_leave_key" ON "makeup_bookings" USING btree ("leave_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "makeup_bookings_student_session_key" ON "makeup_bookings" USING btree ("student_id","session_id");--> statement-breakpoint
CREATE INDEX "makeup_bookings_session_idx" ON "makeup_bookings" USING btree ("session_id");