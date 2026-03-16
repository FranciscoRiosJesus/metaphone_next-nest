import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CheckDuplicateDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  @IsOptional()
  parentEmail?: string;
}
