export default () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
    mail: {
        api_key: process.env.SENDGRID_API_KEY,
        sender_email: process.env.SENDGRID_SENDER_EMAIL,
        sender_name: process.env.SENDGRID_SENDER_NAME
    },
    cloudflare_credentials: {
        access_key: process.env.CLOUDFLARE_ACCESS_KEY,
        secret_access_key: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
        endpoint: process.env.CLOUDFLARE_ENDPOINT,
        bucket: process.env.CLOUDFLARE_BUCKET_NAME
    }
})