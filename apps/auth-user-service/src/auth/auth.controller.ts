import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChildDto, ChildPatchDto, LoginDto, SignupDto } from './dto/auth.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.me(authorization);
  }

  @Get('me/children')
  children(@Headers('authorization') authorization?: string) {
    return this.authService.children(authorization);
  }

  @Post('me/children')
  addChild(@Headers('authorization') authorization: string | undefined, @Body() dto: ChildDto) {
    return this.authService.addChild(authorization, dto);
  }

  @Patch('me/children/:childId')
  updateChild(
    @Headers('authorization') authorization: string | undefined,
    @Param('childId') childId: string,
    @Body() dto: ChildPatchDto,
  ) {
    return this.authService.updateChild(authorization, childId, dto);
  }
}
