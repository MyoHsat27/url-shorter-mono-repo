import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthUser | undefined,
    ctx: ExecutionContext,
  ): AuthUser | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | null | undefined;

    if (!user) return null;
    if (data) return user[data] as unknown as AuthUser;

    return user;
  },
);
