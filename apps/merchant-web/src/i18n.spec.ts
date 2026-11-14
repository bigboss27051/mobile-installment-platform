import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  t,
  translateApiError,
  writeStoredLocale,
} from './i18n';

describe('merchant i18n', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to Thai', () => {
    expect(DEFAULT_LOCALE).toBe('th');
    expect(t('nav.brand')).toBe('ร้านค้า');
    expect(t('login.title')).toBe('เข้าสู่ระบบร้านค้า');
  });

  it('returns English when locale is en', () => {
    expect(t('nav.brand', 'en')).toBe('Merchant');
    expect(t('login.title', 'en')).toBe('Merchant login');
  });

  it('interpolates values', () => {
    expect(t('enroll.sessionId', 'th', { id: 'abc' })).toBe('เซสชัน abc');
  });

  it('falls back to Thai when an English key is missing', () => {
    expect(t('login.title', 'en')).toBeTruthy();
    expect(t('does.not.exist', 'en')).toBe('does.not.exist');
  });

  it('persists Thai as default when storage is empty', () => {
    expect(readStoredLocale()).toBe('th');
  });

  it('stores and reads the selected locale', () => {
    writeStoredLocale('en');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(readStoredLocale()).toBe('en');
  });

  it('translates known API errors into Thai and leaves English unchanged', () => {
    expect(translateApiError('Contract not found.')).toBe('ไม่พบสัญญา');
    expect(translateApiError('Contract not found.', 'en')).toBe('Contract not found.');
  });
});
