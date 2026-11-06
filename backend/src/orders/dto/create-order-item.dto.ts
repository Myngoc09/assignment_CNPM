import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const SIZES = ['S', 'M', 'L', 'ONE_SIZE'] as const;
export type SizeType = (typeof SIZES)[number];

export const TOPPINGS = [
  { name: 'Trân châu', price: 5000 },
  { name: 'Kem cheese', price: 10000 },
  { name: 'Thạch cà phê', price: 5000 },
];

export const TOPPING_PRICE: Record<string, number> = Object.fromEntries(
  TOPPINGS.map((topping) => [topping.name, topping.price]),
);

export class CreateOrderItemDto {
  @IsString({ message: 'productId phải là chuỗi' })
  productId: string;

  @IsIn(SIZES, {
    message: 'size phải là S, M, L hoặc ONE_SIZE',
  })
  size: SizeType;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsIn(Object.keys(TOPPING_PRICE), {
    each: true,
    message: 'topping không hợp lệ',
  })
  toppings?: string[];

  @IsInt()
  @Min(1)
  @Max(20)
  qty: number;
}