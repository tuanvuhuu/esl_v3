ALTER TABLE "center_settings" ADD COLUMN "bank_bin" varchar(8) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "center_settings" ADD COLUMN "bank_account" varchar(30) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "center_settings" ADD COLUMN "bank_account_name" varchar(80) DEFAULT '' NOT NULL;