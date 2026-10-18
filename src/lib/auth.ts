import * as Crypto from 'expo-crypto';
import type { Account } from './types';

export const DEMO_PASSWORD = 'Demo@123';
const DEMO_IDS = ['u-bs1', 'u-bs2', 'u-bn1', 'u-bn2', 'u-qt'];
export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export function isSampleAccount(account: Account) {
  return DEMO_IDS.includes(account.id) && !account.passwordHash;
}
// Local demo credential check only. Production must use server authentication,
// a password KDF, protected sessions and server-side authorization.
export async function hashDemoPassword(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + ':' + password);
}
export async function verifyPassword(account: Account, password: string) {
  if (isSampleAccount(account)) return password === DEMO_PASSWORD;
  return !!account.passwordSalt && !!account.passwordHash
    && await hashDemoPassword(password, account.passwordSalt) === account.passwordHash;
}


export const ACTIVATION_DAYS = 7;
export const MAX_ACTIVATION_ATTEMPTS = 5;
/** Tên đăng nhập theo mã hồ sơ (bn001...) chỉ dành cho tài khoản bác sĩ tạo kèm hồ sơ. */
export const isRecordUsername = (value: string) => /^bn\d+$/.test(normalizeUsername(value));
/** Mã 6 chữ số ngẫu nhiên an toàn để bác sĩ đưa cho bệnh nhân kích hoạt tài khoản. */
export function generateActivationCode() {
  return String(Crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
}
/** Tài khoản bệnh nhân chưa đặt mật khẩu: chỉ đăng nhập được sau khi kích hoạt bằng mã. */
export function isPendingActivation(account: Account) {
  return account.role === 'patient' && !account.passwordHash && !isSampleAccount(account);
}
