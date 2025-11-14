# MockMate API Reference

API endpoints and Edge Functions used by MockMate.

## Supabase Edge Functions

All Edge Functions are deployed to Supabase and called with JWT authentication.

### usage-gate

Checks if user can start a new simulation.

**Endpoint**: `POST /functions/v1/usage-gate`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "ok": true,
  "simulations_used": 2,
  "limit": 3
}
```

**Error Response** (limit reached):
```json
{
  "ok": false,
  "message": "Monthly free limit reached. Upgrade to continue."
}
```

### chat-proxy

Proxies LLM API calls (OpenAI/Gemini).

**Endpoint**: `POST /functions/v1/chat-proxy`

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body**:
```json
{
  "persona": "interviewer" | "codingPartner",
  "system": "system prompt",
  "user": "user message",
  "maxTokens": 1024
}
```

**Response**:
```json
{
  "ok": true,
  "text": "AI response",
  "provider": "gemini",
  "model": "gemini-1.5-flash"
}
```

### session-start

Initializes a new interview session.

**Endpoint**: `POST /functions/v1/session-start`

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body**:
```json
{
  "scenario_type": "dsa" | "system_design" | "bugfix",
  "scenario_id": "two-sum"
}
```

**Response**:
```json
{
  "ok": true,
  "session_id": "uuid"
}
```

### session-event

Logs events during a session.

**Endpoint**: `POST /functions/v1/session-event`

**Body**:
```json
{
  "session_id": "uuid",
  "event_type": "message" | "code_change" | "test_run",
  "data": {}
}
```

### session-finalize

Completes a session and generates summary.

**Endpoint**: `POST /functions/v1/session-finalize`

**Body**:
```json
{
  "session_id": "uuid",
  "solution_code": "function twoSum() {...}"
}
```

### upgrade-tier

Upgrades user subscription to Pro.

**Endpoint**: `POST /functions/v1/upgrade-tier`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "ok": true,
  "subscription_tier": "pro"
}
```

## Website API Routes

### POST /api/chat

Handles AI chat messages for the demo page.

**Body**:
```json
{
  "message": "user message",
  "context": [...previous messages],
  "role": "interviewer" | "partner",
  "workspaceContext": [...files],
  "currentCode": "code string",
  "isProactive": false,
  "userContext": {...}
}
```

**Response**:
```json
{
  "reply": "AI response"
}
```

### POST /api/execute

Executes and tests code (demo page).

**Body**:
```json
{
  "code": "function twoSum(nums, target) {...}"
}
```

**Response**:
```json
{
  "success": true,
  "results": [...test results],
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0,
    "passRate": 100
  }
}
```

## Authentication

All Edge Functions require a JWT token in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

The token is obtained from:
1. Website: Supabase Auth session
2. Extension: Stored after OAuth callback

## Error Handling

All endpoints return errors in this format:

```json
{
  "ok": false,
  "error": "error message"
}
```

HTTP status codes:
- `200` - Success
- `401` - Unauthorized (missing/invalid token)
- `402` - Payment required (usage limit reached)
- `400` - Bad request
- `500` - Server error

