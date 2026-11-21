import { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware
 * Protects cookie-authenticated mutating requests (POST, PUT, PATCH, DELETE).
 * Compares the X-CSRF-Token header against the csrfToken cookie.
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  // Safe read-only requests, login, or external webhooks skip header check
  if (
    !mutatingMethods.includes(req.method) ||
    req.path === '/login' ||
    req.path === '/api/auth/login' ||
    req.path.startsWith('/api/webhooks') ||
    req.baseUrl.startsWith('/api/webhooks')
  ) {
    return next();
  }

  // Only enforce CSRF if cookie-based authentication is present
  const hasAuthCookie = !!req.cookies?.accessToken;
  if (!hasAuthCookie) {
    return next();
  }

  const csrfCookie = req.cookies?.csrfToken;
  const csrfHeader = (req.headers['x-csrf-token'] || req.headers['x-xsrf-token']) as string;

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    res.status(403).json({
      success: false,
      message: 'CSRF token validation failed. Invalid or missing CSRF token.',
    });
    return;
  }

  next();
};

