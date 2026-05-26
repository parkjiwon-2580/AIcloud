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
