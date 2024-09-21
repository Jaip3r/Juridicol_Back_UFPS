import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = 'isPublic'; // Marca un recurso como público
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);