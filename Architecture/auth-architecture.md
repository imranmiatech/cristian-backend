┌──────────────────────────────┐
│        CLIENT LAYER          │
│  Web / Mobile / API Client   │
└─────────────┬────────────────┘
              │  (Login / Requests)
              ▼
┌──────────────────────────────┐
│       SECURITY GATE          │
│  JwtAuthGuard + Passport     │
│  - Extract JWT               │
│  - Validate Signature        │
│  - Attach User Context       │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│        LOGIC LAYER           │
│  AuthService                 │
│  - Token Rotation            │
│  - Device Tracking           │
│  - Session Validation        │
└─────────────┬────────────────┘
              │
       ┌──────┴─────────┐
       ▼                ▼
┌──────────────┐   ┌──────────────┐
│    REDIS     │   │ POSTGRESQL   │
│ Session Cache│   │ Persistent DB│
│ - jti status │   │ - Users      │
│ - Blacklist  │   │ - Devices    │
└──────────────┘   │ - Tokens     │
                   └──────────────┘