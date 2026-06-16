import { BadRequestException, Injectable, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import { Pool, type PoolConfig } from 'pg';
import { isDevEnv, readEnv, readNumberEnv, requireEnv } from '../config';
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
export class AuthService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly onprem: OnpremService) {
    this.pool = new Pool(this.databaseConfig());
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();
    const user = await this.createUser({
      id: randomUUID(),
      email,
      nickname: dto.nickname,
      passwordHash: this.hashPassword(dto.password),
    });

    let initialChildId: string;
    try {
      await this.onprem.createProfile(user.id);
      initialChildId = await this.onprem.createChild({
        cloudUserId: user.id,
        name: dto.child.name,
        birthDate: dto.child.birthDate,
        gender: dto.child.gender,
      });
    } catch (error) {
      await this.deleteUser(user.id);
      throw error;
    }

    const publicUser = this.toPublicUser(user);
    return {
      user: publicUser,
      initialChildId,
      status: 'created',
      message: '회원가입이 완료되었습니다. 로그인 후 서비스를 이용해 주세요.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.findUserByEmail(dto.email.toLowerCase());
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

  async deleteChild(authorization: string | undefined, childId: string) {
    const user = this.requireUser(authorization);
    await this.onprem.deleteChild(childId);
    return { childId, status: 'deleted', cloudUserId: user.id };
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

  private async createUser(input: {
    id: string;
    email: string;
    nickname: string;
    passwordHash: string;
  }): Promise<AuthUserRecord> {
    try {
      const result = await this.pool.query(
        `
          INSERT INTO ai_care.users (id, email, password_hash, nickname, role)
          VALUES ($1, $2, $3, $4, 'USER')
          RETURNING id, email, password_hash, nickname, role
        `,
        [input.id, input.email, input.passwordHash, input.nickname],
      );
      return this.toUserRecord(result.rows[0]);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException('Email or nickname already exists');
      }
      throw error;
    }
  }

  private async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const result = await this.pool.query(
      `
        SELECT id, email, password_hash, nickname, role
        FROM ai_care.users
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );
    return result.rows[0] ? this.toUserRecord(result.rows[0]) : null;
  }

  private async deleteUser(id: string) {
    await this.pool.query('DELETE FROM ai_care.users WHERE id = $1', [id]).catch(() => undefined);
  }

  private toUserRecord(row: {
    id: string;
    email: string;
    password_hash: string;
    nickname: string;
    role: string;
  }): AuthUserRecord {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      nickname: row.nickname,
      role: row.role,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
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

  private databaseConfig(): PoolConfig {
    const ssl = this.databaseSslConfig();
    const connectionString = this.kubernetesSafeDatabaseUrl();
    if (connectionString) {
      return { connectionString, ssl };
    }

    const password = readEnv('RDS_PASSWORD');
    if (!password) {
      throw new Error('RDS_PASSWORD is required');
    }

    return {
      host: requireEnv('RDS_HOST'),
      port: readNumberEnv('RDS_PORT', 5432),
      database: requireEnv('RDS_DB_NAME'),
      user: requireEnv('RDS_USERNAME'),
      password,
      ssl,
    };
  }

  private kubernetesSafeDatabaseUrl(): string {
    const connectionString = readEnv('DATABASE_URL');
    if (!connectionString || !process.env.KUBERNETES_SERVICE_HOST) {
      return connectionString;
    }

    try {
      const host = new URL(connectionString).hostname.toLowerCase();
      if (['localhost', '127.0.0.1', 'host.docker.internal'].includes(host)) {
        return '';
      }
    } catch {
      return connectionString;
    }

    return connectionString;
  }

  private databaseSslConfig(): PoolConfig['ssl'] {
    const enabled = readEnv('RDS_SSL', 'false').toLowerCase();
    if (!['true', '1', 'require'].includes(enabled)) {
      return false;
    }
    return {
      rejectUnauthorized: readEnv('RDS_SSL_REJECT_UNAUTHORIZED', 'false').toLowerCase() === 'true',
    };
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
