
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: { user: { userId: string; email: string } },
  ) {
    return this.ordersService.createOrder(
      createOrderDto,
      req.user.userId,
    );
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @Request() req: { user: { userId: string; email: string } },
  ) {
    return this.ordersService.getMyOrders(
      req.user.userId,
    );
  }
}
