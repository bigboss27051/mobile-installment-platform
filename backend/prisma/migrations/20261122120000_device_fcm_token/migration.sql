-- Device FCM push token for agent-triggered command pollers
ALTER TABLE "devices" ADD COLUMN "fcm_token" TEXT;
ALTER TABLE "devices" ADD COLUMN "fcm_token_updated_at" TIMESTAMP(3);