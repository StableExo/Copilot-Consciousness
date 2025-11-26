/**
 * Authentication Middleware for Express
 */

import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../auth/JWTService';
import { APIKeyService } from '../auth/APIKeyService';
import { RBACService } from '../auth/RBACService';
import { RateLimitService } from '../rate-limiting/RateLimitService';
import { IPWhitelistService } from '../ip-whitelist/IPWhitelistService';
import { IntrusionDetectionService } from '../intrusion-detection/IntrusionDetectionService';
import { AuditLogger, AuditEventType, AuditSeverity } from '../audit/AuditLogger';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
    sessionId: string;
  };
  apiKey?: {
    id: string;
    userId: string;
    scopes: string[];
  };
}

export class SecurityMiddleware {
  constructor(
    private jwtService: JWTService,
    private apiKeyService: APIKeyService,
    private rbacService: RBACService,
    private rateLimitService: RateLimitService,
    private ipWhitelistService: IPWhitelistService,
    private idsService: IntrusionDetectionService,
    private auditLogger: AuditLogger
  ) {}

  /**
   * JWT Authentication Middleware
   */
  authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);
      const payload = this.jwtService.verifyToken(token);

      req.user = {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        sessionId: payload.sessionId,
      };

      next();
    } catch (error) {
      this.auditLogger.log(
        AuditEventType.AUTH_FAILED,
        AuditSeverity.WARNING,
        { reason: 'Invalid JWT token', error: String(error) },
        {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        }
      );

      res.status(401).json({ error: 'Invalid token' });
    }
  };

  /**
   * API Key Authentication Middleware
   */
  authenticateAPIKey = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        res.status(401).json({ error: 'No API key provided' });
        return;
      }

      const validKey = this.apiKeyService.validateAPIKey(apiKey);

      if (!validKey) {
        this.auditLogger.log(
          AuditEventType.AUTH_FAILED,
          AuditSeverity.WARNING,
          { reason: 'Invalid API key' },
          {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          }
        );

        res.status(401).json({ error: 'Invalid API key' });
        return;
      }

      req.apiKey = {
        id: validKey.id,
        userId: validKey.userId,
        scopes: validKey.scopes,
      };

      next();
    } catch (error) {
      res.status(500).json({ error: 'Authentication error' });
    }
  };

  /**
   * Permission Check Middleware
   */
  requirePermission = (resource: string, action: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasPermission = this.rbacService.hasPermission(req.user.role as any, resource, action);

      if (!hasPermission) {
        this.auditLogger.log(
          AuditEventType.AUTH_FAILED,
          AuditSeverity.WARNING,
          {
            reason: 'Insufficient permissions',
            resource,
            action,
          },
          {
            userId: req.user.userId,
            username: req.user.username,
            ip: req.ip,
          }
        );

        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    };
  };

  /**
   * Rate Limiting Middleware
   */
  rateLimit = (scope: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      const identifier = req.user?.userId || req.apiKey?.userId || req.ip || 'unknown';

      try {
        // Check if blocked by IDS
        const clientIp = req.ip || 'unknown';
        const isBlocked = await this.idsService.isBlocked(clientIp);
        if (isBlocked) {
          res.status(403).json({ error: 'Access blocked' });
          return;
        }

        const result = await this.rateLimitService.checkLimit(scope, identifier);

        // Set rate limit headers
        const rateLimitConfig = this.rateLimitService['configs'].get(scope);
        const limit = rateLimitConfig?.maxRequests || 60;
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.resetTime);

        if (!result.allowed) {
          this.auditLogger.log(
            AuditEventType.RATE_LIMIT_EXCEEDED,
            AuditSeverity.WARNING,
            { scope, identifier },
            {
              userId: req.user?.userId,
              ip: req.ip,
            }
          );

          res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Rate limit error:', error);
        next(); // Fail open on error
      }
    };
  };

  /**
   * IP Whitelist Middleware
   */
  checkIPWhitelist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || 'unknown';
    const result = this.ipWhitelistService.checkIP(ip);

    if (!result.allowed) {
      this.auditLogger.log(
        AuditEventType.IP_BLOCKED,
        AuditSeverity.WARNING,
        { reason: result.reason, country: result.country },
        { ip }
      );

      res.status(403).json({ error: result.reason || 'Access denied' });
      return;
    }

    next();
  };

  /**
   * Intrusion Detection Middleware
   */
  detectIntrusions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const threats = await this.idsService.analyzeRequest({
        ip: req.ip || 'unknown',
        userId: (req as AuthRequest).user?.userId,
        path: req.path,
        query: req.query as Record<string, any>,
        body: req.body,
        headers: req.headers as Record<string, string>,
      });

      if (threats.length > 0) {
        for (const threat of threats) {
          this.auditLogger.log(
            AuditEventType.INTRUSION_DETECTED,
            AuditSeverity.CRITICAL,
            {
              threatType: threat.type,
              threatLevel: threat.level,
              details: threat.details,
            },
            {
              userId: (req as AuthRequest).user?.userId,
              ip: req.ip,
            }
          );
        }

        if (threats.some((t) => t.blocked)) {
          res.status(403).json({ error: 'Security threat detected' });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('IDS error:', error);
      next(); // Fail open on error
    }
  };
}
