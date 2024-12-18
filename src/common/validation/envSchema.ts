import * as Joi from "joi";

export const envSchema = Joi.object({
    PORT: Joi.number().integer().min(1).max(65535).required(),
    DATABASE_URL: Joi.string().required(),
    ACCESS_TOKEN_SECRET: Joi.string().required(),
    REFRESH_TOKEN_SECRET: Joi.string().required(),
    SENDGRID_API_KEY: Joi.string().required(),
    SENDGRID_SENDER_EMAIL: Joi.string().required(),
    SENDGRID_SENDER_NAME: Joi.string().required(),
    CLOUDFLARE_ACCESS_KEY: Joi.string().required(),
    CLOUDFLARE_SECRET_ACCESS_KEY: Joi.string().required(),
    CLOUDFLARE_ENDPOINT: Joi.string().required(),
    CLOUDFLARE_BUCKET_NAME: Joi.string().required(),
    PAGE_SIZE: Joi.number().integer().min(1).required()
});