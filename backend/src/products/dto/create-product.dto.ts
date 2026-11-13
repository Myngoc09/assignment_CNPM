
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductSizePriceDto {
  @IsString()
  @IsIn(['S', 'M', 'L', 'ONE_SIZE'])
  size: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSizePriceDto)
  prices: ProductSizePriceDto[];
}
