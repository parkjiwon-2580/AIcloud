import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { isDevEnv, readEnv } from '../config';
import { OnpremService } from '../onprem/onprem.service';
import { ChildDto, ChildPatchDto, LoginDto, SignupDto } from './dto/auth.dto';

interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  role: string;
}

interface AuthUserRecord extends AuthUser {
  passwordHash: string;
}

@Injectable()
export class AuthService {
  private readonly usersByEmail = new Map<string, AuthUserRecord>();
  private readonly usersByNickname = new Map<string, AuthUserRecord>();

  constructor(private readonly onprem: OnpremService) {}

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();
    if (this.usersByEmail.has(email)) {
      throw new BadRequestException('Email already exists');
    }
    if (this.usersByNickname.has(dto.nickname)) {
      throw new BadRequestException('Nickname already exists');
    }

    const user: AuthUserRecord = {
      id: randomUUID(),
      email,
      nickname: dto.nickname,
      passwordHash: this.hashPassword(dto.password),
      role: 'USER',
    };
    this.usersByEmail.set(user.email, user);
    this.usersByNickname.set(user.nickname, user);

    await this.onprem.createProfile(user.id);
    const initialChildId = await this.onprem.createChild({
      cloudUserId: user.id,
      name: dto.child.name,
      birthDate: dto.child.birthDate,
      gender: dto.child.gender,
    });
    const publicUser = this.toPublicUser(user);
    return {
      user: publicUser,
      initialChildId,
      status: 'created',
      message: '회원가입이 완료되었습니다. 로그인 후 서비스를 이용해 주세요.',
    };
  }

  async login(dto: LoginDto) {
    const user = this.usersByEmail.get(dto.email.toLowerCase());
    if (!user || !this.verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const publicUser = this.toPublicUser(user);
    return { user: publicUser, token: this.signToken(publicUser) };
  }

  me(authorization?: string) {
    return this.requireUser(authorization);
  }

  children(authorization?: string) {
    return this.onprem.listChildren(this.requireUser(authorization).id);
  }

  async addChild(authorization: string | undefined, dto: ChildDto) {
    const user = this.requireUser(authorization);
    const childId = await this.onprem.createChild({
      cloudUserId: user.id,
      name: dto.name,
      birthDate: dto.birthDate,
      gender: dto.gender,
      detailJson: dto.detailJson,
    });
    return { childId };
  }

  async updateChild(authorization: string | undefined, childId: string, dto: ChildPatchDto) {
    const user = this.requireUser(authorization);
    // TODO: onprem-sensitive-api should verify child ownership by cloud_user_id.
    await this.onprem.updateChild(childId, dto);
    return { childId, status: 'updated', cloudUserId: user.id };
  }

  requireUser(authorization?: string): AuthUser {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }
    const user = this.verifyToken(authorization.slice('Bearer '.length));
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [, salt, hash] = stored.split(':');
    if (!salt || !hash) {
      return false;
    }
    const expected = Buffer.from(hash, 'hex');
    const actual = scryptSync(password, salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private signToken(user: AuthUser): string {
    const header = this.encode({ alg: 'HS256', typ: 'JWT' });
    const payload = this.encode({
      sub: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    });
    return `${header}.${payload}.${this.sign(`${header}.${payload}`)}`;
  }

  private verifyToken(token: string): AuthUser | null {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature || this.sign(`${header}.${payload}`) !== signature) {
      return null;
    }
    try {
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      if (!decoded.sub || (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000))) {
        return null;
      }
      return {
        id: decoded.sub,
        email: decoded.email,
        nickname: decoded.nickname,
        role: decoded.role ?? 'USER',
      };
    } catch {
      return null;
    }
  }

  private sign(value: string): string {
    return createHmac('sha256', this.jwtSecret()).update(value).digest('base64url');
  }

  private jwtSecret(): string {
    const secret = readEnv('JWT_SECRET');
    if (secret) {
      return secret;
    }
    if (isDevEnv()) {
      return 'dev-only-jwt-secret';
    }
    throw new UnauthorizedException('JWT secret is not configured');
  }

  private encode(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private toPublicUser(user: { id: string; email: string; nickname: string; role: string }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
    };
  }
}
