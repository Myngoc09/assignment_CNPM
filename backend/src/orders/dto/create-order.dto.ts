import { IsArray, ValidateNested, ArrayMinSize, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}