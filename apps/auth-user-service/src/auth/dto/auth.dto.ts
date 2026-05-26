import { IsEmail, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class InitialChildDto {
  @IsString()
  name!: string;

  @IsString()
  birthDate!: string;

  @IsString()
  gender!: string;
}

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  nickname!: string;

  @IsObject()
  child!: InitialChildDto;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class ChildDto {
  @IsString()
  name!: string;

  @IsString()
  birthDate!: string;

  @IsString()
  gender!: string;

  @IsOptional()
  @IsObject()
  detailJson?: Record<string, unknown>;
}

export class ChildPatchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsObject()
  detailJson?: Record<string, unknown>;
}
