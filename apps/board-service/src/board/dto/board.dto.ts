import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class BoardPostDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsArray()
  imageS3Keys?: string[];
}
