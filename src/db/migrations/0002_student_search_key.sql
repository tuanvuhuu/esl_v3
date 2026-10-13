ALTER TABLE "students" ADD COLUMN "search_key" varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "students_search_key_idx" ON "students" USING btree ("search_key");