
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductRecipeItemDto {
  @IsUUID()
  ingredientId: string;

  @IsString()
  @IsIn(['S', 'M', 'L', 'ONE_SIZE'])
  size: string;

  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  quantity: number;
}

export class SaveProductRecipesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductRecipeItemDto)
  recipes: ProductRecipeItemDto[];
}
