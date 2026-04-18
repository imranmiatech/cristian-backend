import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'Email' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
