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

export const SIZES = ['S', 'M', 'L'] as const;
export type SizeType = (typeof SIZES)[number];

// BẢNG GIÁ TOPPING (Đã có chữ export để file service gọi sang được)
export const TOPPING_PRICE: Record<string, number> = {
  TRAN_CHAU: 5000,
  KEM: 5000,
  // Bạn có thể thêm các loại topping khác ở đây nếu cần
};

export class CreateOrderItemDto {
  @IsString({ message: 'productId phải là chuỗi' })
  productId: string;

  @IsIn(SIZES, { message: 'size phải là S, M hoặc L' })
  size: SizeType;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsIn(Object.keys(TOPPING_PRICE), { each: true, message: 'topping không hợp lệ' })
  toppings?: string[];

  @IsInt()
  @Min(1)
  @Max(20)
  qty: number;
}