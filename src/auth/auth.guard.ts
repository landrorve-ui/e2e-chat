import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyAccessToken } from './token.service';
import type { Request } from 'express';

type RequestWithUser = Request & { userId?: string };

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = req.headers.authorization;

    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const cookieToken = req.cookies?.['auth-token'] as string | undefined;
    const token = bearerToken || cookieToken;

    if (!token) {
      throw new UnauthorizedException('Missing auth token');
    }

    const userId = verifyAccessToken(token);
    if (!userId) {
      throw new UnauthorizedException('Invalid auth token');
    }

    req.userId = userId;
    return true;
  }
}
