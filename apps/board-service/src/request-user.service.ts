import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { isDevEnv, readEnv } from './config';

interface RequestUser {
  id: string;
  role: string;
}

@Injectable()
export class RequestUserService {
  requireAdmin(authorization?: string): RequestUser {
    const user = this.requireUser(authorization);
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Admin role required');
    }
    return user;
  }

  private requireUser(authorization?: string): RequestUser {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }
    const user = this.verifyToken(authorization.slice('Bearer '.length));
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
      if (!decoded.sub) {
        return null;
      }
      return { id: decoded.sub, role: decoded.role ?? 'USER' };
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
