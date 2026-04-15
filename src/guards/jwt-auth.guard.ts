import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentCodeConfigService } from '../agentcode.config';
import { AgentCodeException } from '../errors/agentcode-exception';
import type { AgentCodeRequest } from '../interfaces/agentcode-request.interface';

/**
 * Simple JWT guard that verifies the Bearer token, loads the user
 * (with userRoles for permission checks), and attaches to `request.user`.
 * If the route is in a public group, it is typically skipped at the registration layer.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly config: AgentCodeConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AgentCodeRequest>();
    if (req.__skipAuth) return true;
    const header = String(req.headers?.authorization ?? '');
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw AgentCodeException.unauthorized('Missing bearer token');
    }
    const payload = this.auth.verifyToken(token);
    const userModel = this.config.authConfig().userModel;
    const delegate = this.prisma.model(userModel);
    const user = await delegate.findUnique({
      where: { id: payload.sub },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw AgentCodeException.unauthorized('User not found');
    req.user = user;
    return true;
  }
}
