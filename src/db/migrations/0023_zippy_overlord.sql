ALTER TABLE "classes" ALTER COLUMN "schedule" SET DATA TYPE varchar(300);--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "schedule" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "day_times" SET DATA TYPE varchar(300);--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "day_times" SET DEFAULT '';