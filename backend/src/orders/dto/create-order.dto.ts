import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Giỏ hàng không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  promoCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsToRedeem?: number;
}
