
import {
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async register(registerDto: RegisterDto) {
    const { fullName, email, phone, password } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email da duoc dang ky');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      message: 'Dang ky thanh cong',
      user: {
        id: savedUser.id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        phone: savedUser.phone,
        createdAt: savedUser.createdAt,
      },
    };
  }
}
