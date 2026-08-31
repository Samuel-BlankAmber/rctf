CREATE TABLE "challenge_views" (
	"user_id" text NOT NULL,
	"challenge_id" text NOT NULL,
	"first_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_views_pkey" PRIMARY KEY("user_id","challenge_id")
);
--> statement-breakpoint
ALTER TABLE "challenge_views" ADD CONSTRAINT "challenge_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "challenge_views" ADD CONSTRAINT "challenge_views_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "challenge_views_last_viewed_at_index" ON "challenge_views" USING btree ("last_viewed_at");