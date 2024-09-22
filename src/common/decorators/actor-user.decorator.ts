import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ActorUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    }
);