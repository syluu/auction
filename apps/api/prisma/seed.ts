/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const VND = (n: number) => n.toFixed(2);
const min = (m: number) => m * 60 * 1000;

async function main() {
  const adminUser = process.env.ADMIN_USERNAME ?? 'admin';
  const adminPass = process.env.ADMIN_PASSWORD ?? 'admin123';
  await prisma.user.upsert({
    where: { username: adminUser },
    update: { role: 'admin', passwordHash: await argon2.hash(adminPass) },
    create: { username: adminUser, displayName: 'Admin', role: 'admin', passwordHash: await argon2.hash(adminPass), authProvider: 'local', externalId: adminUser },
  });

  const names = [['nguyenan', 'Nguyễn An'], ['tranbinh', 'Trần Bình'], ['lechi', 'Lê Chi'], ['hoangdung', 'Hoàng Dũng'], ['phamhuy', 'Phạm Huy']];
  const users: { id: number }[] = [];
  for (const [username, displayName] of names) {
    users.push(await prisma.user.upsert({ where: { username }, update: {}, create: { username, displayName, authProvider: 'local', externalId: username } }));
  }

  const existing = await prisma.campaign.findFirst({ where: { name: { path: ['vi'], equals: 'Đấu giá Mùa Thu 2026' } } });
  if (existing) { console.log('seed: campaign already exists, skipping'); return; }

  const img = (seed: string) => [`https://picsum.photos/seed/${seed}/800/600`];
  const items = [
    { name: { vi: 'iPhone 15 Pro Max 256GB Titan tự nhiên', en: 'iPhone 15 Pro Max 256GB Natural Titanium' }, desc: { vi: 'Máy mới 100%, nguyên seal, bảo hành chính hãng 12 tháng.', en: 'Brand new, sealed, 12-month official warranty.' }, original: 34_990_000, start: 20_000_000, step: 500_000, img: 'iphone' },
    { name: { vi: 'Tranh sơn mài Phố cổ Hội An', en: 'Lacquer painting – Hoi An Old Town' }, desc: { vi: 'Lê Minh (b. 1975). Sơn mài trên gỗ, 60 × 90 cm, 2019. Có chữ ký và chứng nhận.', en: 'Le Minh (b. 1975). Lacquer on wood, 60 × 90 cm, 2019. Signed with certificate.' }, original: 25_000_000, start: 10_000_000, step: 500_000, img: 'hoian' },
    { name: { vi: 'Đồng hồ Seiko Presage SRPD37', en: 'Seiko Presage SRPD37' }, desc: { vi: 'Automatic, mặt cocktail xanh, fullbox 2024.', en: 'Automatic, blue cocktail dial, full box 2024.' }, original: 12_500_000, start: 7_000_000, step: 200_000, img: 'seiko' },
    { name: { vi: 'Gốm Bát Tràng men lam (bộ 6)', en: 'Bat Trang blue-glaze ceramic set (6 pcs)' }, desc: { vi: 'Bộ 6 chén trà vẽ tay, kèm hộp gỗ.', en: 'Six hand-painted tea cups with wooden box.' }, original: 3_500_000, start: 1_500_000, step: 100_000, img: 'battrang' },
    { name: { vi: 'Máy ảnh Fujifilm X-T5', en: 'Fujifilm X-T5 camera' }, desc: { vi: 'Body đen, 3.200 shot, kèm 2 pin.', en: 'Black body, 3,200 shots, two batteries.' }, original: 42_000_000, start: 28_000_000, step: 500_000, img: 'fuji' },
    { name: { vi: 'Áo dài lụa thêu tay', en: 'Hand-embroidered silk ao dai' }, desc: { vi: 'Lụa Hà Đông, thêu hoa sen, size M.', en: 'Ha Dong silk, lotus embroidery, size M.' }, original: 6_000_000, start: 3_000_000, step: 100_000, img: 'aodai' },
    { name: { vi: 'Xe đạp Giant Escape 2', en: 'Giant Escape 2 bicycle' }, desc: { vi: 'Size M, đã dùng 6 tháng, bảo dưỡng đầy đủ.', en: 'Size M, 6 months old, fully serviced.' }, original: 11_000_000, start: 7_000_000, step: 200_000, img: 'giant' },
    { name: { vi: 'Loa Marshall Stanmore III', en: 'Marshall Stanmore III speaker' }, desc: { vi: 'Màu đen, fullbox, còn bảo hành.', en: 'Black, full box, under warranty.' }, original: 9_900_000, start: 6_000_000, step: 200_000, img: 'marshall' },
    { name: { vi: 'Tranh lụa Thiếu nữ', en: 'Silk painting – Young Woman' }, desc: { vi: 'Tranh lụa 50 × 70 cm, khung gỗ.', en: 'Silk painting 50 × 70 cm, wooden frame.' }, original: 8_000_000, start: 5_000_000, step: 200_000, img: 'silk' },
    { name: { vi: 'Nhẫn bạc chạm khắc', en: 'Engraved silver ring' }, desc: { vi: 'Bạc 925, chạm thủ công.', en: '925 silver, hand engraved.' }, original: 2_500_000, start: 1_500_000, step: 100_000, img: 'ring' },
  ];

  const now = Date.now();
  const campaign = await prisma.campaign.create({
    data: { name: { vi: 'Đấu giá Mùa Thu 2026', en: 'Autumn Auction 2026' }, currency: 'VND', status: 'scheduled', startAt: new Date(now - min(30)) },
  });

  // schedule: 2 ended (with winners), 3 live now, 5 upcoming staggered 10 min apart
  const schedule = [
    { start: -30, end: -20 }, { start: -25, end: -15 },
    { start: -5, end: 6 }, { start: -3, end: 9 }, { start: -1, end: 12 },
    { start: 10, end: 25 }, { start: 20, end: 35 }, { start: 30, end: 45 }, { start: 40, end: 55 }, { start: 50, end: 65 },
  ];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const product = await prisma.product.create({ data: { name: it.name, description: it.desc, images: img(it.img), originalPrice: VND(it.original) } });
    const s = schedule[i];
    const startAt = new Date(now + min(s.start)), endAt = new Date(now + min(s.end));
    const isEnded = s.end < 0, isLive = s.start <= 0 && s.end > 0;
    const auction = await prisma.auction.create({
      data: {
        campaignId: campaign.id, productId: product.id, sortOrder: i + 1,
        status: isEnded ? 'ended' : isLive ? 'live' : 'pending',
        startPrice: VND(it.start), stepPrice: VND(it.step), extendWindowS: 30, extendByS: 30, maxExtensions: 20,
        startAt, endAt, currentEndAt: endAt,
      },
    });

    // a few historical bids on ended + live items
    if (isEnded || isLive) {
      const n = isEnded ? 6 : 2 + i;
      let price = it.start;
      let leaderId: number | null = null, leaderBidId: number | null = null;
      for (let b = 0; b < n; b++) {
        const u = users[(b + i) % users.length];
        const bid = await prisma.bid.create({ data: { auctionId: auction.id, userId: u.id, amount: VND(price), createdAt: new Date(startAt.getTime() + (b + 1) * 20_000) } });
        leaderId = u.id; leaderBidId = bid.id;
        price += it.step * (1 + (b % 2));
      }
      const finalPrice = price - it.step * (1 + ((n - 1) % 2));
      await prisma.auction.update({ where: { id: auction.id }, data: { currentPrice: VND(finalPrice), leadingUserId: leaderId, leadingBidId: leaderBidId, bidCount: n, version: n } });
      if (isEnded) {
        await prisma.auctionResult.create({ data: { auctionId: auction.id, campaignId: campaign.id, winnerId: leaderId, startPrice: VND(it.start), finalPrice: VND(finalPrice), priceGain: VND(finalPrice - it.start), endedAt: endAt } });
      }
    }
  }
  console.log(`seed: campaign #${campaign.id} with ${items.length} auctions. admin=${adminUser}/${adminPass}, users: ${names.map((n) => n[0]).join(', ')}`);
}

main().finally(() => prisma.$disconnect());
