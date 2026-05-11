export default () => ({
  port: parseInt(process.env.PORT || '9000', 10),
  node_env: process.env.NODE_ENV || 'development',

  database_url: process.env.DATABASE_URL,

  security: {
    bcrypt_salt_rounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  auth: {
    max_sessions: parseInt(process.env.MAX_SESSIONS || '5', 10),
    max_login_attempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lock_time_minutes: parseInt(process.env.LOCK_TIME_MINUTES || '12', 10),
  },

  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '15m',

    refresh_secret: process.env.JWT_REFRESH_SECRET,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    refresh_ttl_days: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),

    issuer: process.env.JWT_ISSUER || 'willgus_auth_service',
    audience: process.env.JWT_AUDIENCE || 'willgus_web_client',
  },

  aws: {
    region: process.env.AWS_REGION,
    regionFace: process.env.AWS_REGION_FACE,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    AWS_REKOGNITION_COLLECTION_ID: process.env.AWS_REKOGNITION_COLLECTION_ID,
  },

  redis: {
    host: process.env.UPSTASH_REDIS_REST_URL ? process.env.UPSTASH_REDIS_REST_URL.replace('https://', '').split('/')[0] : (process.env.REDIS_HOST || 'localhost'),
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_PASSWORD,
    upstash_rest_url: process.env.UPSTASH_REDIS_REST_URL,
    upstash_rest_token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Your App <no-reply@yourapp.com>',
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:5173',
})