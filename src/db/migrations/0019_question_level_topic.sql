ALTER TABLE "questions" ADD COLUMN "level" varchar(10) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "topic" varchar(60) DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "questions_level_topic_idx" ON "questions" USING btree ("level","topic");