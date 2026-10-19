import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other', 'prefer_not_to_say'])
  gender?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;
}