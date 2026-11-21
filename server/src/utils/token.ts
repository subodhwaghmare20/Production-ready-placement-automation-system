import { Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export interface TokenPayload {
  adminId: string;
  email: string;
  role: string;
  sessionId?: string;
  tokenVersion?: number;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};

export const setAuthCookie = (res: Response, token: string): void => {
  const isProduction = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
  // 7 days in milliseconds
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const sameSite = (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict') || (isProduction && process.env.COOKIE_SAMESITE !== 'lax' ? 'none' : 'lax');

  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: sameSite === 'none' ? true : isProduction,
    sameSite,
    maxAge,
    path: '/',
  });
};

export const clearAuthCookie = (res: Response): void => {
  const isProduction = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
  const sameSite = (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict') || (isProduction && process.env.COOKIE_SAMESITE !== 'lax' ? 'none' : 'lax');

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: sameSite === 'none' ? true : isProduction,
    sameSite,
    path: '/',
  });
  res.clearCookie('csrfToken', {
    secure: sameSite === 'none' ? true : isProduction,
    sameSite,
    path: '/',
  });
};

export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const setCsrfCookie = (res: Response, csrfToken: string): void => {
  const isProduction = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  const sameSite = (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict') || (isProduction && process.env.COOKIE_SAMESITE !== 'lax' ? 'none' : 'lax');

  // CSRF token is not HttpOnly so frontend Axios client can read it to send in headers
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false,
    secure: sameSite === 'none' ? true : isProduction,
    sameSite,
    maxAge,
    path: '/',
  });
};

