import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const CATEGORIES = ['예방접종', '질환정보', '주의사항', '발달', '영양', '응급징후', '공지'] as const;
const TARGET_AGE_MONTHS = ['전체', '0-6', '7-12', '13-24', '25-36', '37-60'] as const;

export class BoardPostDto {
  @IsString()
  @IsIn(CATEGORIES)
  category!: string;

  @IsString()
  @IsIn(TARGET_AGE_MONTHS)
  targetAgeMonths!: string;

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
