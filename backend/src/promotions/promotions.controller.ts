import { Body, Controller, Get, Post } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { ValidatePromoDto } from './dto/validate-promo.dto';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  listActive() {
    return this.promotionsService.listActive();
  }

  @Post('validate')
  validate(@Body() dto: ValidatePromoDto) {
    return this.promotionsService.validate(dto.code, dto.subtotal);
  }
}
