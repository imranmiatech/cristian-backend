import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: 'cristina@gmail.com',
        description: 'Valid email address',
    })
    @IsEmail()
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'cristina',
        description: 'Password (min 4 characters)',
    })
    @IsNotEmpty()
    @MinLength(4)
    password: string;
  
}
