import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { isDevEnv, readEnv } from './config';

export interface RequestUser {
  id: string;
  email?: string;
  nickname?: string;
  role?: string;
}

@Injectable()
export class RequestUserService {
  getUser(authorization?: string): RequestUser | null {
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }
    return this.verifyToken(authorization.slice('Bearer '.length));
  }

  requireUser(authorization?: string): RequestUser {
    const user = this.getUser(authorization);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }

  private verifyToken(token: string): RequestUser | null {
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
        role: decoded.role,
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
}
