<<<<<<< HEAD
import {
  IsInt,
  IsString,
} from 'class-validator';

export class CreateQuestionnaireDto {

  @IsInt()
  childId!: number;

  @IsString()
  symptomText!: string;
}
=======
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateQuestionnaireDto {
  @IsUUID()
  childId!: string;

  @IsString()
  @MinLength(1)
  symptomText!: string;

  @IsOptional()
  @IsUUID()
  cloudUserId?: string;
}
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
