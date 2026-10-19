
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, {
    message: 'Mat khau moi phai co it nhat 8 ky tu',
  })
  newPassword: string;
}
