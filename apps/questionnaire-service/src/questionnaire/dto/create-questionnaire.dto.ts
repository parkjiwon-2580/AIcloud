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