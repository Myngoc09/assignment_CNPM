
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  fullName: string; // Ho ten nguoi dung.

  @IsEmail()
  email: string; // Kiem tra email hop le.

  @IsString()
  @Matches(/^[0-9]{10,11}$/, {
    message: 'So dien thoai phai co 10-11 chu so.',
  })
  phone: string; // So dien thoai.

  @IsString()
  @MinLength(8) // Mat khau toi thieu 8 ky tu.
  @MaxLength(72) // Gioi han de phu hop voi bcrypt.
  password: string;
}
