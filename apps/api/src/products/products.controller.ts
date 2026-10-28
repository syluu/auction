import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { productInput, type ProductInput } from '@auction/shared';
import { AdminOnly } from '../common/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { ProductsService } from './products.service';
import { env } from '../config/env';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

@AdminOnly()
@Controller('admin/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get() list() { return this.products.list(); }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) { return this.products.get(id); }
  @Post() create(@Body(new ZodPipe(productInput)) body: ProductInput) { return this.products.create(body); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(productInput)) body: ProductInput) { return this.products.update(id, body); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.products.remove(id); }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 8 * 1024 * 1024 },
    storage: diskStorage({
      destination: join(process.cwd(), env.UPLOAD_DIR),
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
    }),
    fileFilter: (_req, file, cb) => cb(null, ALLOWED.includes(extname(file.originalname).toLowerCase())),
  }))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: 'INVALID_FILE', allowed: ALLOWED });
    return { url: `/uploads/${file.filename}` };
  }
}
