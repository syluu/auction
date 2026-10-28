import { PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/** Usage: @Body(new ZodPipe(schema)) body: z.infer<typeof schema> */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    return this.schema.parse(value); // ZodError -> ZodExceptionFilter -> 400
  }
}
