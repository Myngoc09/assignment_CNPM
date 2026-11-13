import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class AdjustIngredientDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  newStock: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}