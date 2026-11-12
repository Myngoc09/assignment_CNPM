import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class ValidatePromoDto {
  @IsString()
  @MaxLength(40)
  code: string;

  @IsInt()
  @Min(0)
  subtotal: number;
}
