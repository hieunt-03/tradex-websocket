# Mobile WebSocket Handoff (OTP)

This document is for iOS/Android developers integrating OTP realtime updates.

## Connection

- Protocol: SocketCluster-compatible (v14 style)
- Endpoint: `wss://tnhsvpro.nhsv.vn/ws/socketcluster/`
- Transport: WebSocket (TLS)

## OTP Flow

1. Connect to the endpoint.
2. Build OTP channel name:
   - `CHANNEL_NAME = ACCOUNT_NO.toUpperCase() + "_" + SUBSCRIPTION_ID.toUpperCase()`
3. Subscribe to `CHANNEL_NAME`.
4. Emit register event:
   - Event: `otp-notification-register`
   - Payload:

```json
{
  "accountNo": "039C200327",
  "subscriptionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "channel": "039C200327_A1B2C3D4-E5F6-7890-ABCD-EF1234567890"
}
```

5. Listen for messages on the subscribed channel.

## Expected OTP Message

Example payload:

```json
{
  "otp_value": "2792"
}
```

## Notes

- Do not rely on `curl` as the full test method.
  - `curl` can only simulate the initial upgrade request.
  - Full flow requires connect + subscribe + emit + listen.
- If backend does not return ack for register event, use fire-and-forget emit mode.
- On reconnect:
  - resubscribe to OTP channel
  - resend `otp-notification-register`

## Quick Validation Checklist

- Can connect to `wss://tnhsvpro.nhsv.vn/ws/socketcluster/`
- Can subscribe to computed OTP channel
- Register event is emitted without client error
- OTP message is received on subscribed channel

## Reference (Project Local)

- Web test UI: `index.html`
- Main logic: `script.js`
- SocketCluster client bundle: `socketCluster.js` (v14.2.1)
- Codec bundle: `sc-codec-min-bin.js`
