import {
  IsNumber,
  IsOptional,
  IsString,
  IsPositive,
  MaxLength,
} from 'class-validator';

export class ImportIngredientDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}