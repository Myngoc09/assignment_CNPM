import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoyaltyService } from './loyalty.service';

type AuthenticatedRequest = Request & {
  user: { userId: string; email: string };
};

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  getSummary(@Req() req: AuthenticatedRequest) {
    return this.loyaltyService.getSummary(req.user.userId);
  }

  @Get('me/transactions')
  getHistory(@Req() req: AuthenticatedRequest) {
    return this.loyaltyService.getHistory(req.user.userId);
  }
}
