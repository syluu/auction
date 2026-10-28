import { Injectable, NotFoundException } from '@nestjs/common';
import type { ProductInput } from '@auction/shared';
import { PrismaService } from '../prisma/prisma.service';
import { toProductDTO } from '../common/dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.product.findMany({ orderBy: { id: 'desc' } });
    return rows.map(toProductDTO);
  }
  async get(id: number) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    return toProductDTO(p);
  }
  async create(input: ProductInput) {
    return toProductDTO(await this.prisma.product.create({ data: { name: input.name, description: input.description, images: input.images, originalPrice: input.originalPrice } }));
  }
  async update(id: number, input: ProductInput) {
    return toProductDTO(await this.prisma.product.update({ where: { id }, data: { name: input.name, description: input.description, images: input.images, originalPrice: input.originalPrice } }));
  }
  async remove(id: number) {
    const used = await this.prisma.auction.count({ where: { productId: id } });
    if (used) return { ok: false, code: 'PRODUCT_IN_USE' };
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }
}
