import { createHash, randomBytes } from 'node:crypto';

export function normalizeKey(value) {
  return String(value ?? '').trim().toUpperCase();
}

export function hashLicenseKey(key) {
  return createHash('sha256').update(normalizeKey(key), 'utf8').digest('hex');
}

export function generateLicenseKey() {
  const bytes = randomBytes(15).toString('hex').toUpperCase();
  const chunks = bytes.match(/.{1,5}/g);
  return `AAIF-LIFE-${chunks.join('-')}`;
}

export function issueLifetimeLicense({ accountId = null, maxDevices = 2, maxChannels = 1 } = {}) {
  const licenseKey = generateLicenseKey();
  const now = new Date().toISOString();
  return {
    licenseId: `lic_${randomBytes(10).toString('hex')}`,
    licenseKey,
    keyHash: hashLicenseKey(licenseKey),
    plan: 'lifetime',
    status: 'issued',
    expiresAt: null,
    accountId,
    maxDevices,
    maxChannels,
    entitlements: {
      aiGeneration: true,
      youtubeAutomation: true,
      analytics: true,
    },
    issuedAt: now,
    activatedAt: null,
    devices: [],
  };
}

export function activateLicense(license, { accountId, deviceId, channelCount = 0 } = {}) {
  if (!license) throw new Error('INVALID_LICENSE');
  if (!accountId || !deviceId) throw new Error('INVALID_REQUEST');
  if (license.status === 'suspended' || license.status === 'revoked') throw new Error('LICENSE_NOT_ACTIVE');
  if (license.accountId && license.accountId !== accountId) throw new Error('LICENSE_OWNERSHIP_MISMATCH');
  if (channelCount > license.maxChannels) throw new Error('CHANNEL_LIMIT_EXCEEDED');

  const knownDevice = license.devices.includes(deviceId);
  if (!knownDevice && license.devices.length >= license.maxDevices) throw new Error('DEVICE_LIMIT_EXCEEDED');
  if (!knownDevice) license.devices.push(deviceId);

  license.accountId = accountId;
  license.status = 'active';
  license.activatedAt ??= new Date().toISOString();
  return publicLicense(license);
}

export function publicLicense(license) {
  const { keyHash, licenseKey, devices, ...safe } = license;
  return { ...safe, deviceCount: devices.length };
}
