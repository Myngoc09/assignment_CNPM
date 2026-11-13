
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Tai khoan khong ton tai',
      );
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      birthDate: user.birthDate,
      address: user.address,
      createdAt: user.createdAt,
      role: user.role,
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Tai khoan khong ton tai',
      );
    }

    if (updateProfileDto.fullName !== undefined) {
      user.fullName = updateProfileDto.fullName.trim();
    }

    if (updateProfileDto.phone !== undefined) {
      user.phone = updateProfileDto.phone.trim();
    }

    if (updateProfileDto.gender !== undefined) {
      user.gender = updateProfileDto.gender;
    }

    if (updateProfileDto.birthDate !== undefined) {
      user.birthDate = updateProfileDto.birthDate;
    }

    if (updateProfileDto.address !== undefined) {
      user.address = updateProfileDto.address.trim();
    }

    await this.userRepository.save(user);

    return {
      message: 'Cap nhat ho so thanh cong',
      ...await this.getProfile(userId),
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Email hoac mat khau khong dung',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        'Email hoac mat khau khong dung',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken =
      await this.jwtService.signAsync(payload);

    return {
      message: 'Dang nhap thanh cong',
      access_token: accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }


  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Khong tiet lo email co ton tai hay khong
    const message =
      'Neu email ton tai, huong dan dat lai mat khau se duoc gui.';

    if (!user) {
      return { message };
    }

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256')
      .update(rawToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await this.userRepository.save(user);
    console.log('FORGOT: token', rawToken.slice(0, 8), 'hash', hashedToken.slice(0, 8));

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:3000';

    const resetUrl =
      `${frontendUrl}/reset-password?token=${rawToken}`;

    console.log('MAIL_USER:', this.configService.get('MAIL_USER'));
    console.log('MAIL_PORT:', this.configService.get('MAIL_PORT'));
    console.log(
      'MAIL_APP_PASSWORD da duoc nap:',
      !!this.configService.get('MAIL_APP_PASSWORD'),
    );

    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: Number(this.configService.get<string>('MAIL_PORT') ?? 465),
      secure:
        this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_APP_PASSWORD'),
      },
    });

    try {

      console.log('Dang thu gui email den:', user.email);

      const info = await transporter.sendMail({
        from: this.configService.get<string>('MAIL_USER'),
        to: user.email,
        subject: 'Dat lai mat khau BrewLite',
        text: `De dat lai mat khau, mo lien ket sau trong 15 phut: ${resetUrl}`,
        html: `
          <h2>Dat lai mat khau BrewLite</h2>
          <p>Ban da yeu cau dat lai mat khau.</p>
          <p><a href="${resetUrl}">Dat lai mat khau</a></p>
          <p>Lien ket het han sau 15 phut. Neu ban khong yeu cau, hay bo qua email nay.</p>
        `,
      });

      console.log('Gui email thanh cong:', info.messageId);

    } catch (error) {
      console.error(
        'Loi gui email:',
        error instanceof Error ? error.message : error,
      );

      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await this.userRepository.save(user);

      throw new BadRequestException(
        'Khong the gui email luc nay. Vui long thu lai sau.',
      );
    }

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = createHash('sha256')
      .update(dto.token)
      .digest('hex');

      console.log('RESET: do dai', dto.token.length, 'token', dto.token.slice(0, 8), 'hash', hashedToken.slice(0, 8));

    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: hashedToken },
    });

    if (!user) {
      console.log('Reset password: khong tim thay token trong database');

      throw new BadRequestException(
        'Token khong hop le. Vui long yeu cau email dat lai mat khau moi.',
      );
    }

    if (!user.resetPasswordExpires) {
      console.log('Reset password: token khong co thoi gian het han');

      throw new BadRequestException(
        'Token khong hop le. Vui long yeu cau email dat lai mat khau moi.',
      );
    }

    const expiresAt = new Date(user.resetPasswordExpires).getTime();

    if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      console.log('Reset password: token da het han');

      throw new BadRequestException(
        'Lien ket da het han. Vui long yeu cau email moi.',
      );
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.userRepository.save(user);

    return { message: 'Dat lai mat khau thanh cong.' };
  }

}
