import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  NATIONAL_ID_ENCRYPTION_KEY: Joi.string().min(32).required(),
  KYC_STORAGE_ROOT: Joi.string().default('./storage/kyc'),
  OCR_PROVIDER: Joi.string().valid('sandbox').default('sandbox'),
  PAYMENT_WEBHOOK_SECRET: Joi.string().min(32).required(),
  PAYMENT_PROVIDER: Joi.string().valid('sandbox').default('sandbox'),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).default('unused-refresh-secret'),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
  CUSTOMER_OTP_SANDBOX_CODE: Joi.string().default('123456'),
  MERCHANT_WEB_ORIGIN: Joi.string().default('http://localhost:5173'),
  TLS_CERT_PATH: Joi.string().optional().allow(''),
  TLS_KEY_PATH: Joi.string().optional().allow(''),
  HTTPS_PORT: Joi.number().optional(),
  /** Empty/unset = overdue evaluate cron disabled. Invalid cron fails boot. */
  OVERDUE_EVALUATE_CRON: Joi.string().optional().allow(''),
  /** Optional; falls back to NATIONAL_ID_ENCRYPTION_KEY for LINE credential encryption. */
  LINE_CREDENTIALS_ENCRYPTION_KEY: Joi.string().min(32).optional().allow(''),
});
