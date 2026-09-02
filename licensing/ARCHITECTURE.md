# Production License Delivery & Activation Architecture

## Goal

Provide a secure, automated customer journey from confirmed purchase to Lifetime License activation without exposing license secrets in the application or source repository.

## Customer flow

`ORDER_PAID → LICENSE_ISSUED → DELIVERY_QUEUED → DELIVERED → ACTIVATION_REQUEST → ACTIVE`

1. Payment provider sends a verified server-side payment confirmation.
2. Backend creates one Lifetime License and a cryptographically random raw key.
3. Backend stores only a secure hash of the key plus license metadata.
4. Raw key is returned only to the delivery service for the initial customer message.
5. Customer receives the key in the account dashboard and, when configured, by email/SMS.
6. Customer signs in and enters the key in the web or Android client.
7. API validates the key, account ownership, status, device limit and channel limit.
8. Activation creates an auditable device binding and marks the license Active.
9. Client receives entitlements and displays `LIFETIME ACTIVE`.

## License key rules

- Generate keys with a cryptographically secure random source.
- Use a non-ambiguous human-readable format, for example `AAIF-LIFE-XXXX-XXXX-XXXX`.
- Never generate predictable sequential keys.
- Never hard-code production keys in source code, APKs, tests, screenshots or documentation.
- Store only a one-way secure hash of the production key at rest.
- Do not log the raw key.

## Activation API contract

### POST `/api/v1/licenses/activate`

Request:

```json
{
  "licenseKey": "AAIF-LIFE-XXXX-XXXX-XXXX",
  "deviceId": "server-generated-stable-device-id",
  "deviceName": "Android phone",
  "client": "android"
}
```

Response on success:

```json
{
  "status": "active",
  "plan": "lifetime",
  "expiresAt": null,
  "maxDevices": 2,
  "maxChannels": 1,
  "entitlements": {}
}
```

The API must not return the stored hash or other server-only security fields.

## Validation rules

Activation succeeds only when:

- the authenticated account is valid;
- the supplied key matches a stored hash;
- status is `issued` or `active`;
- Lifetime expiry is null;
- the requested device is already bound or the device limit has capacity;
- account/channel limits are not exceeded;
- the license is not suspended or revoked.

All activation and deactivation operations create audit records.

## Delivery architecture

`Payment Provider → Payment Webhook → Order Service → License Service → Notification Service`

Notification channels are provider adapters:

- `email`
- `sms`
- `in_app`

Delivery must be idempotent. A retried payment webhook must not issue a second license for the same paid order.

## Admin operations

The admin console will support:

- issue Lifetime License manually;
- inspect license status;
- resend delivery message without creating a new license;
- activate/deactivate devices;
- transfer ownership with an audit record;
- change channel/device entitlements;
- suspend/revoke;
- replace a compromised key;
- inspect activation and delivery history.

## Security boundaries

- Payment secrets remain in the server/CI secret store.
- Email/SMS provider credentials remain in the server/secret store.
- License hashing and validation are server-side.
- The Android/web client is never the source of truth for entitlement state.
- Rate-limit activation and validation endpoints.
- Return generic invalid-key errors to reduce enumeration risk.
- Apply HTTPS in production.
- Never place private signing keys in the client application.

## Cost model

Lifetime means no license expiration. It does not mean unlimited consumption of variable-cost third-party services. AI generation, voice, image/video rendering, YouTube integrations and cloud infrastructure may be governed by usage quotas or separate service billing.
