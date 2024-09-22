import { applyDecorators, UseGuards } from "@nestjs/common";
import { Rol } from "src/users/enum/rol.enum";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "../guard/roles.guard";


export function Authorization(rol: Rol[]) {

    return applyDecorators(
        Roles(rol),
        UseGuards(RolesGuard)
    );

}