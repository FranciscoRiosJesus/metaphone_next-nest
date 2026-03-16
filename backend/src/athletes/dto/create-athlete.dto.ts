import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class CreateAthleteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  position!: string;

  @IsEmail()
  @IsNotEmpty()
  parentEmail!: string;
}
