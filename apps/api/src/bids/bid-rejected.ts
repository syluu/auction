import { HttpException } from '@nestjs/common';
import type { BidErrorCode, BidRejection } from '@auction/shared';

export class BidRejected extends HttpException {
  constructor(code: BidErrorCode, extra: Omit<BidRejection, 'code'> = {}) {
    super({ code, ...extra } satisfies BidRejection, code === 'RATE_LIMITED' ? 429 : 409);
  }
}
