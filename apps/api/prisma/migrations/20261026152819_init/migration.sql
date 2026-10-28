-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'live', 'finished');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('pending', 'live', 'ended', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT,
    "auth_provider" TEXT NOT NULL DEFAULT 'local',
    "external_id" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL DEFAULT '{}',
    "images" JSONB NOT NULL DEFAULT '[]',
    "original_price" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" SERIAL NOT NULL,
    "name" JSONB NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "start_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'pending',
    "start_price" DECIMAL(14,2) NOT NULL,
    "step_price" DECIMAL(14,2) NOT NULL,
    "extend_window_s" INTEGER NOT NULL DEFAULT 30,
    "extend_by_s" INTEGER NOT NULL DEFAULT 30,
    "max_extensions" INTEGER,
    "extension_count" INTEGER NOT NULL DEFAULT 0,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "current_end_at" TIMESTAMPTZ NOT NULL,
    "current_price" DECIMAL(14,2),
    "leading_bid_id" INTEGER,
    "leading_user_id" INTEGER,
    "bid_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" SERIAL NOT NULL,
    "auction_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_results" (
    "auction_id" INTEGER NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "winner_id" INTEGER,
    "start_price" DECIMAL(14,2) NOT NULL,
    "final_price" DECIMAL(14,2),
    "price_gain" DECIMAL(14,2),
    "ended_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "auction_results_pkey" PRIMARY KEY ("auction_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_external_id_key" ON "users"("auth_provider", "external_id");

-- CreateIndex
CREATE INDEX "auctions_campaign_id_idx" ON "auctions"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_campaign_id_sort_order_key" ON "auctions"("campaign_id", "sort_order");

-- CreateIndex
CREATE INDEX "bids_auction_id_amount_idx" ON "bids"("auction_id", "amount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "bids_auction_id_amount_key" ON "bids"("auction_id", "amount");

-- CreateIndex
CREATE INDEX "auction_results_campaign_id_price_gain_idx" ON "auction_results"("campaign_id", "price_gain" DESC);

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_leading_user_id_fkey" FOREIGN KEY ("leading_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_results" ADD CONSTRAINT "auction_results_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_results" ADD CONSTRAINT "auction_results_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_results" ADD CONSTRAINT "auction_results_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
