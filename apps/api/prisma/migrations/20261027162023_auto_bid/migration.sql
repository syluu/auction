-- AlterTable
ALTER TABLE "bids" ADD COLUMN     "is_auto" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "auto_bids" (
    "id" SERIAL NOT NULL,
    "auction_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "max_price" DECIMAL(14,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "auto_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "auto_bids_auction_id_active_max_price_idx" ON "auto_bids"("auction_id", "active", "max_price" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "auto_bids_auction_id_user_id_key" ON "auto_bids"("auction_id", "user_id");

-- AddForeignKey
ALTER TABLE "auto_bids" ADD CONSTRAINT "auto_bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_bids" ADD CONSTRAINT "auto_bids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
