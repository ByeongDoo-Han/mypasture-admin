import { z } from 'zod';

/** 이메일 로그인 입력과 백엔드 응답을 검증하고 브라우저에 필요한 필드만 남깁니다. */
export const emailLoginRequestSchema = z.object({ email: z.string().trim().email().max(320) }).strict();
export const emailLoginConfirmSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().length(6).regex(/^\d{6}$/),
}).strict();
export const emailLoginChallengeSchema = z.object({
  challengeId: z.string().uuid(),
  expiresInSeconds: z.number().int().positive().max(3600),
  resendAfterSeconds: z.number().int().nonnegative().max(3600),
}).refine((value) => value.resendAfterSeconds <= value.expiresInSeconds);

const tokenSchema = z.string().min(1).max(4096).refine((value) => !/[^A-Za-z0-9._~-]/.test(value));
export const adminLoginSessionSchema = z.object({
  token: tokenSchema,
  refreshToken: tokenSchema,
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive().max(30 * 24 * 60 * 60),
  expiresAt: z.string().datetime({ offset: true }).refine((value) => Date.parse(value) > Date.now()),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email().max(320).nullable().optional(),
    displayName: z.string().min(1).max(200),
    role: z.enum(['USER', 'PREMIUM', 'PASTURE_LEADER', 'ADMIN']),
  }),
});

export type EmailLoginChallenge = z.infer<typeof emailLoginChallengeSchema>;

/** 누락·변조된 Origin과 스킴 차이를 거부하여 로그인 CSRF를 막습니다. */
export function isStrictSameOrigin(origin: string | null, requestUrl: string): boolean {
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const target = new URL(requestUrl);
    return ['http:', 'https:'].includes(source.protocol)
      && origin === source.origin
      && source.origin === target.origin;
  } catch {
    return false;
  }
}

/** Next의 localhost 정규화 대신 원본 Host를 사용하고 운영 프록시의 외부 HTTPS를 확인합니다. */
export function isAdminLoginSameOrigin(origin: string | null, requestUrl: string, host: string | null, requireHttps: boolean): boolean {
  if (!host || /[\s,/@\\?#]/.test(host)) return false;
  try {
    const protocol = requireHttps ? 'https:' : new URL(requestUrl).protocol;
    if (!['http:', 'https:'].includes(protocol)) return false;
    const authority = `${protocol}//${host.toLowerCase()}`;
    const target = new URL(authority);
    // URL 파서가 잘못된 Host를 경로·자격 증명·다른 주소로 보정하면 허용하지 않습니다.
    if (target.origin !== authority) return false;
    return isStrictSameOrigin(origin, target.origin);
  } catch {
    return false;
  }
}
