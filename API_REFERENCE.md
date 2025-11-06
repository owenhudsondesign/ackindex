# API Reference

Complete reference for all AckIndex API endpoints.

---

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

---

## Authentication

### Admin Endpoints

Admin endpoints require HTTP Basic Auth:

```bash
Authorization: Basic base64(username:password)
```

Credentials are configured via environment variables:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

### User Endpoints

User endpoints use Supabase authentication with JWT tokens.

---

## Public Endpoints

### Chat

#### `POST /api/chat`

Send a chat message and get AI response with citations.

**Request Body**:
```json
{
  "message": "What are the zoning regulations?",
  "conversationId": "uuid-optional",
  "userId": "uuid-optional"
}
```

**Response**:
```json
{
  "response": "According to the zoning regulations...",
  "sources": [
    {
      "title": "Zoning Bylaws",
      "url": "https://...",
      "chunk": "Relevant excerpt..."
    }
  ],
  "conversationId": "uuid",
  "messageId": "uuid"
}
```

**Status Codes**:
- `200` - Success
- `400` - Invalid request
- `429` - Rate limit exceeded
- `500` - Server error

---

### Contact Form

#### `POST /api/contact`

Submit contact form message.

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I have a question..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

---

## Conversation Endpoints

### `GET /api/conversations`

Get all conversations for current user.

**Query Parameters**:
- `userId` (required) - User ID

**Response**:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Zoning Questions",
      "created_at": "2025-11-05T12:00:00Z",
      "updated_at": "2025-11-05T12:30:00Z",
      "message_count": 5
    }
  ]
}
```

---

### `GET /api/conversations/[id]`

Get specific conversation with all messages.

**Response**:
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Zoning Questions",
    "created_at": "2025-11-05T12:00:00Z",
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "What are the zoning rules?",
        "created_at": "2025-11-05T12:00:00Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "The zoning rules are...",
        "created_at": "2025-11-05T12:00:05Z",
        "sources": [...]
      }
    ]
  }
}
```

---

### `DELETE /api/conversations/[id]`

Delete a conversation and all its messages.

**Response**:
```json
{
  "success": true,
  "message": "Conversation deleted"
}
```

---

## User Endpoints

### `GET /api/user/dashboard`

Get user statistics and usage info.

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscription_tier": "premium",
    "created_at": "2025-10-01T00:00:00Z"
  },
  "usage": {
    "queries_this_month": 45,
    "queries_limit": 100,
    "conversations": 12
  },
  "subscription": {
    "tier": "premium",
    "status": "active",
    "current_period_end": "2025-12-01T00:00:00Z"
  }
}
```

---

## Authentication Endpoints

### `POST /api/auth/signup`

Create new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "jwt-token"
  }
}
```

---

## Stripe Endpoints

### `POST /api/stripe/create-checkout`

Create Stripe checkout session for subscription.

**Request Body**:
```json
{
  "userId": "uuid",
  "priceId": "price_..."
}
```

**Response**:
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

---

### `POST /api/stripe/portal`

Create Stripe customer portal session for managing subscription.

**Request Body**:
```json
{
  "customerId": "cus_..."
}
```

**Response**:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

---

### `POST /api/stripe/webhook`

Stripe webhook endpoint for subscription events.

**Headers**:
- `stripe-signature` - Webhook signature for verification

**Events Handled**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## Admin Endpoints

All admin endpoints require Basic Auth.

### Documents

#### `GET /api/admin/documents`

Get all documents with pagination.

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 50)
- `status` (optional) - Filter by status: `pending`, `completed`, `failed`
- `search` (optional) - Search by title or URL

**Response**:
```json
{
  "documents": [
    {
      "id": "uuid",
      "url": "https://...",
      "title": "Document Title",
      "status": "completed",
      "chunk_count": 42,
      "created_at": "2025-11-05T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

#### `DELETE /api/admin/documents/[id]`

Delete document and all its chunks.

**Response**:
```json
{
  "success": true,
  "message": "Document deleted",
  "chunks_deleted": 42
}
```

---

### Scraping

#### `POST /api/admin/scrape-url`

Trigger web scraping for a URL.

**Request Body**:
```json
{
  "url": "https://example.com/page",
  "scheduled": false
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "uuid",
  "message": "Scraping job queued"
}
```

**Job Processing**:
1. Job added to `scraping` queue
2. Apify actor scrapes the URL
3. Content parsed and chunked
4. Embeddings generated automatically
5. Document marked as `completed`

---

#### `POST /api/admin/upload-url`

Bulk upload multiple URLs for scraping.

**Request Body**:
```json
{
  "urls": [
    "https://example.com/page1",
    "https://example.com/page2",
    "https://example.com/page3"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "queued": 3,
  "jobIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

#### `POST /api/admin/upload-pdf`

Upload and process PDF files.

**Request**:
- Content-Type: `multipart/form-data`
- Field name: `file`
- Max size: 200MB

**Response**:
```json
{
  "success": true,
  "documentId": "uuid",
  "jobId": "uuid",
  "message": "PDF queued for processing"
}
```

**Processing**:
- Files < 4.5MB: Processed immediately
- Files > 4.5MB: Uploaded to Supabase Storage, queued for processing

---

### Embeddings

#### `POST /api/admin/generate-embeddings`

Manually trigger embedding generation for documents without embeddings.

**Request Body**:
```json
{
  "documentIds": ["uuid1", "uuid2"],
  "force": false
}
```

**Response**:
```json
{
  "success": true,
  "queued": 2,
  "jobIds": ["uuid1", "uuid2"]
}
```

---

### Scheduled Scraping

#### `GET /api/admin/scheduled-scrapes`

Get all scheduled scraping jobs.

**Response**:
```json
{
  "schedules": [
    {
      "id": "uuid",
      "url": "https://example.com",
      "frequency": "daily",
      "enabled": true,
      "last_run": "2025-11-05T02:00:00Z",
      "next_run": "2025-11-06T02:00:00Z"
    }
  ]
}
```

---

#### `POST /api/admin/scheduled-scrapes`

Create new scheduled scraping job.

**Request Body**:
```json
{
  "url": "https://example.com",
  "frequency": "daily",
  "time": "02:00"
}
```

**Frequencies**:
- `daily` - Every day at specified time
- `weekly` - Every week on specified day
- `monthly` - First day of each month

---

#### `DELETE /api/admin/scheduled-scrapes/[id]`

Delete scheduled scraping job.

---

### Analytics

#### `GET /api/admin/analytics`

Get usage analytics and metrics.

**Response**:
```json
{
  "queries": {
    "total": 1250,
    "this_month": 320,
    "today": 45
  },
  "documents": {
    "total": 150,
    "pending": 5,
    "completed": 142,
    "failed": 3
  },
  "users": {
    "total": 48,
    "free": 35,
    "premium": 13,
    "new_this_month": 8
  },
  "costs": {
    "openai_this_month": 67.32,
    "stripe_revenue": 116.87
  }
}
```

---

### Job Management

#### `GET /api/admin/jobs/[jobId]`

Get status of specific background job.

**Response**:
```json
{
  "job": {
    "id": "uuid",
    "queue": "scraping",
    "status": "completed",
    "progress": 100,
    "result": {
      "documentId": "uuid",
      "chunks": 42
    },
    "created_at": "2025-11-05T10:00:00Z",
    "completed_at": "2025-11-05T10:02:30Z"
  }
}
```

**Statuses**:
- `waiting` - In queue
- `active` - Processing
- `completed` - Success
- `failed` - Error occurred
- `delayed` - Retry scheduled

---

#### `POST /api/admin/job-actions`

Perform actions on jobs (retry, delete, etc.).

**Request Body**:
```json
{
  "action": "retry",
  "jobId": "uuid",
  "queue": "scraping"
}
```

**Actions**:
- `retry` - Retry failed job
- `remove` - Delete job
- `promote` - Move delayed job to active

---

#### `GET /api/admin/workers`

Get worker health status.

**Response**:
```json
{
  "workers": [
    {
      "id": "worker-1",
      "status": "active",
      "queues": ["scraping", "embedding", "pdf"],
      "processing": {
        "scraping": 2,
        "embedding": 5,
        "pdf": 0
      },
      "last_heartbeat": "2025-11-05T12:30:00Z"
    }
  ],
  "health": "healthy"
}
```

---

### Bull Board

#### `GET /api/admin/bull-board`

Access Bull Board queue monitoring dashboard.

Web interface for viewing:
- Active jobs
- Completed jobs
- Failed jobs
- Queue metrics
- Retry jobs
- Delete jobs

---

## Cron Endpoints

### `GET /api/cron/scrape`

Scheduled scraping cron job (runs daily at 2 AM).

**Headers**:
- `Authorization: Bearer <CRON_SECRET>`

**Response**:
```json
{
  "success": true,
  "processed": 12,
  "queued": 12
}
```

---

## Rate Limiting

Rate limits by tier:

| Tier | Queries/Month | Requests/Minute |
|------|---------------|-----------------|
| Free | 50 | 5 |
| Premium | Unlimited | 20 |
| Admin | Unlimited | Unlimited |

**Rate Limit Headers**:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1699123200
```

**Rate Limit Response**:
```json
{
  "error": "Rate limit exceeded",
  "limit": 5,
  "reset": 1699123200
}
```

---

## Error Responses

Standard error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

**Common Error Codes**:
- `INVALID_REQUEST` - Malformed request
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Webhooks

### Stripe Webhooks

Endpoint: `POST /api/stripe/webhook`

**Events**:
1. `customer.subscription.created` - New subscription
2. `customer.subscription.updated` - Subscription changed
3. `customer.subscription.deleted` - Subscription cancelled
4. `invoice.payment_succeeded` - Payment successful
5. `invoice.payment_failed` - Payment failed

**Handler Actions**:
- Update `user_profiles.subscription_tier`
- Update `user_profiles.subscription_status`
- Create entry in `subscription_history`
- Send notification email

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Chat request
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'What are the zoning rules?',
    conversationId: 'uuid-optional',
  }),
});

const data = await response.json();
console.log(data.response);
```

### cURL

```bash
# Admin endpoint with Basic Auth
curl -X POST https://your-domain.com/api/admin/scrape-url \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Public endpoint
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the parking rules?"}'
```

### Python

```python
import requests

# Chat request
response = requests.post(
    'https://your-domain.com/api/chat',
    json={
        'message': 'What are the zoning rules?',
        'conversationId': 'uuid-optional'
    }
)

data = response.json()
print(data['response'])

# Admin endpoint
response = requests.post(
    'https://your-domain.com/api/admin/scrape-url',
    auth=('admin', 'password'),
    json={'url': 'https://example.com'}
)
```

---

## Testing

### Test Endpoints Locally

```bash
# Start dev server
npm run dev

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Test admin endpoint
curl -X GET http://localhost:3000/api/admin/documents \
  -u admin:password
```

### Load Testing

Use tools like `k6` or `artillery` for load testing:

```javascript
// k6 load test script
import http from 'k6/http';

export default function() {
  http.post('https://your-domain.com/api/chat', {
    message: 'What are the zoning rules?'
  });
}
```

---

**Last Updated**: November 5, 2025
