import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { LoginUseCase } from '../application/login.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { MeUseCase } from '../application/me.use-case';
import { RefreshUseCase } from '../application/refresh.use-case';
import { AUTH_CONFIG, type AuthConfig } from '../auth.tokens';
import {
  REFRESH_COOKIE_NAME,
  mapAuthError,
  toTokenPairResponse,
  type TokenPairResponse,
} from './auth-http';
import { clearRefreshCookieOptions, readCookie, refreshCookieOptions } from './cookie';
import { AUTH_REQUIRED, JwtAuthGuard, type AuthRequest } from './jwt-auth.guard';
import { RefreshOriginGuard } from './origin.guard';
import { loginSchema } from './schemas';
import { AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS, ipAndLoginTracker } from './throttle';
import { parseBody } from './validation';

/** 5 attempts/minute per IP+login on every /auth/* route (SPEC C3/C15). */
const AUTH_THROTTLE = {
  default: {
    limit: AUTH_RATE_LIMIT,
    ttl: AUTH_RATE_WINDOW_MS,
    getTracker: ipAndLoginTracker,
  },
} as const;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(LoginUseCase) private readonly loginUseCase: LoginUseCase,
    @Inject(RefreshUseCase) private readonly refreshUseCase: RefreshUseCase,
    @Inject(LogoutUseCase) private readonly logoutUseCase: LogoutUseCase,
    @Inject(MeUseCase) private readonly meUseCase: MeUseCase,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Exchange credentials for an access token + refresh cookie' })
  @ApiOkResponse({
    description: 'Access token in the body (15m), refresh token in an httpOnly cookie (30d)',
  })
  @ApiResponse({
    status: 401,
    description: 'Generic: identical for unknown account and wrong password',
  })
  @ApiResponse({ status: 429, description: 'More than 5 attempts/minute per IP+login' })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenPairResponse> {
    const command = parseBody(loginSchema, body);
    try {
      const pair = await this.loginUseCase.execute(command);
      res.cookie(
        REFRESH_COOKIE_NAME,
        pair.refreshToken,
        refreshCookieOptions(this.config.cookiePath),
      );
      return toTokenPairResponse(pair);
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  @Post('refresh')
  @UseGuards(RefreshOriginGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Rotate the refresh token (cookie only, access not required)' })
  @ApiOkResponse({ description: 'New access token in the body, new refresh cookie' })
  @ApiResponse({ status: 401, description: 'Generic: unknown, expired or reused token' })
  @ApiResponse({ status: 403, description: 'Cross-origin request (Origin/Sec-Fetch-Site)' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenPairResponse> {
    const raw = readCookie(req.headers.cookie, REFRESH_COOKIE_NAME);
    try {
      const pair = await this.refreshUseCase.execute(raw);
      res.cookie(
        REFRESH_COOKIE_NAME,
        pair.refreshToken,
        refreshCookieOptions(this.config.cookiePath),
      );
      return toTokenPairResponse(pair);
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Revoke the whole refresh family and clear the cookie' })
  @ApiResponse({ status: 204, description: 'Always 204 (idempotent)' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const raw = readCookie(req.headers.cookie, REFRESH_COOKIE_NAME);
    await this.logoutUseCase.execute(raw);
    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions(this.config.cookiePath));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Current profile from a valid access token' })
  @ApiOkResponse({ description: 'id, email, role' })
  @ApiResponse({ status: 401, description: 'Missing, expired or invalid access token' })
  async me(@Req() req: AuthRequest): Promise<{ id: string; email: string; role: string }> {
    if (!req.user) {
      // Defensive: JwtAuthGuard always attaches claims before this runs.
      throw new UnauthorizedException(AUTH_REQUIRED);
    }
    return this.meUseCase.execute(req.user);
  }
}
