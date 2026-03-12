import { IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6, maxLength: 50 })
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6, maxLength: 50 })
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}
