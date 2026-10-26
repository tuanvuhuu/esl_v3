ALTER TABLE "tuition_payments" ADD COLUMN "kind" varchar(10) DEFAULT 'payment' NOT NULL;--> statement-breakpoint
ALTER TABLE "tuition_payments" ADD COLUMN "ref_id" integer;