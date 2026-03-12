import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      const existing = await this.usersRepository.findOne({ where: { email: registerDto.email } });
      if (existing) {
        this.logger.warn(`Registration attempt with existing email: ${registerDto.email}`);
        throw new BadRequestException('Email already exists');
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(registerDto.password, salt);

      const user = this.usersRepository.create({
        email: registerDto.email,
        password_hash: passwordHash,
      });

      await this.usersRepository.save(user);
      this.logger.log(`User registered successfully: ${user.id}`);

      const payload = { email: user.email, sub: user.id };
      return {
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      this.logger.error(`Error during registration for ${registerDto.email}`, error.stack);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.usersRepository.findOne({ where: { email: loginDto.email } });
      if (!user) {
        this.logger.warn(`Login attempt for non-existent user: ${loginDto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const isMatch = await bcrypt.compare(loginDto.password, user.password_hash);
      if (!isMatch) {
         this.logger.warn(`Invalid password attempt for user: ${loginDto.email}`);
         throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`User logged in successfully: ${user.id}`);
      const payload = { email: user.email, sub: user.id };
      return {
         access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      this.logger.error(`Error during login for ${loginDto.email}`, error.stack);
      throw error;
    }
  }
}
