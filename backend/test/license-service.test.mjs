import test from 'node:test';
import assert from 'node:assert/strict';
import { issueLifetimeLicense, activateLicense } from '../src/license-service.mjs';

test('issues a lifetime license with no expiry', () => {
  const license = issueLifetimeLicense({ maxDevices: 2, maxChannels: 1 });
  assert.equal(license.plan, 'lifetime');
  assert.equal(license.expiresAt, null);
  assert.equal(license.status, 'issued');
  assert.match(license.licenseKey, /^AAIF-LIFE-[A-F0-9-]+$/);
});

test('activates a license and binds a device', () => {
  const license = issueLifetimeLicense({ maxDevices: 1 });
  const result = activateLicense(license, { accountId: 'acct_1', deviceId: 'device_1' });
  assert.equal(result.status, 'active');
  assert.equal(result.expiresAt, null);
  assert.equal(result.deviceCount, 1);
});

test('rejects a second device beyond the limit', () => {
  const license = issueLifetimeLicense({ maxDevices: 1 });
  activateLicense(license, { accountId: 'acct_1', deviceId: 'device_1' });
  assert.throws(() => activateLicense(license, { accountId: 'acct_1', deviceId: 'device_2' }), /DEVICE_LIMIT_EXCEEDED/);
});
