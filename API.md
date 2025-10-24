# AckIndex API Documentation

## Overview

AckIndex provides a simple REST API for fetching civic data. All endpoints return JSON.

## Base URL

```
Production: https://ackindex.com/api
Development: http://localhost:3000/api
```

## Endpoints

### GET /api/entries

Fetch civic entries with optional filtering.

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | string | Filter by category | `?category=Budget` |

**Valid Categories:**
- `Budget`
- `Real Estate`
- `Town Meeting`
- `Infrastructure`
- `General`

**Example Request:**

```bash
curl https://ackindex.com/api/entries?category=Budget
```

**Example Response:**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "FY2026 Town Budget Proposal",
    "source": "Town Finance Department",
    "category": "Budget",
    "summary": "The FY2026 budget proposes...",
    "key_metrics": [
      {
        "label": "Total Budget",
        "value": "$128M"
      }
    ],
    "visualizations": [
      {
        "type": "bar",
        "labels": ["FY2024", "FY2025", "FY2026"],
        "values": [115, 122, 128]
      }
    ],
    "notable_updates": [
      "Proposed funding increase for schools"
    ],
    "date_published": "2025-10-15",
    "created_at": "2025-10-15T10:30:00Z"
  }
]
```

**Response Codes:**

- `200 OK` - Success
- `500 Internal Server Error` - Database error

### POST /api/upload

Upload and parse a civic document (requires authentication).

**Authentication:**

Requires valid Supabase session cookie.

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF document (max 10MB) |
| `title` | string | No | Document title (auto-generated if empty) |
| `category` | string | Yes | One of: Budget, Real Estate, Town Meeting, Infrastructure, General |
| `source` | string | Yes | Source department or organization |

**Example Request:**

```bash
curl -X POST https://ackindex.com/api/upload \
  -H "Cookie: sb-access-token=..." \
  -F "file=@budget-2026.pdf" \
  -F "title=FY2026 Budget" \
  -F "category=Budget" \
  -F "source=Town Finance Department"
```

**Example Response (Success):**

```json
{
  "success": true,
  "entry": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "FY2026 Town Budget Proposal",
    "category": "Budget",
    "created_at": "2025-10-23T14:30:00Z"
  }
}
```

**Example Response (Error):**

```json
{
  "error": "File size must be less than 10MB",
  "details": "Uploaded file was 15MB"
}
```

**Response Codes:**

- `200 OK` - Upload successful
- `400 Bad Request` - Invalid file or parameters
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Processing error

**Upload Process:**

1. File validated (type, size)
2. PDF text extracted
3. AI parses text into structured data
4. PDF stored in Supabase Storage
5. Structured data stored in database
6. Entry returned to client

**Processing Time:**

- Small PDFs (<1MB): ~10-15 seconds
- Large PDFs (5-10MB): ~30-60 seconds

## Data Models

### CivicEntry

```typescript
{
  id: string;                    // UUID
  title: string;                 // Document title
  source: string;                // Source organization
  category: Category;            // Document category
  summary: string;               // 2-paragraph summary
  key_metrics: KeyMetric[];      // Important numbers
  visualizations: Visualization[]; // Chart data
  notable_updates?: string[];    // Key highlights
  date_published?: string;       // Original pub date (YYYY-MM-DD)
  document_excerpt?: string;     // Optional excerpt
  created_at: string;            // ISO 8601 timestamp
  updated_at?: string;           // ISO 8601 timestamp
}
```

### KeyMetric

```typescript
{
  label: string;   // Metric name (e.g., "Total Budget")
  value: string;   // Formatted value (e.g., "$128M")
}
```

### Visualization

```typescript
{
  type: 'bar' | 'line' | 'pie' | 'donut' | 'timeline' | 'table';
  labels: string[];   // X-axis or category labels
  values: number[];   // Corresponding numeric values
}
```

## Rate Limits

**Public Endpoints:**
- 100 requests per hour per IP
- No authentication required

**Upload Endpoint:**
- 10 uploads per hour per authenticated user
- Requires Supabase authentication

**Exceeding Limits:**

Returns `429 Too Many Requests`:

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 3600
}
```

## Error Handling

All errors return JSON with this structure:

```json
{
  "error": "Human-readable error message",
  "details": "Optional technical details"
}
```

**Common Error Codes:**

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid parameters, wrong file type |
| 401 | Unauthorized | Missing or invalid authentication |
| 413 | Payload Too Large | File exceeds 10MB |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database or AI processing error |

## Usage Examples

### Fetch All Entries

```javascript
const response = await fetch('https://ackindex.com/api/entries');
const entries = await response.json();
console.log(entries);
```

### Fetch Budget Entries Only

```javascript
const response = await fetch('https://ackindex.com/api/entries?category=Budget');
const budgets = await response.json();
```

### Upload Document (with Supabase Auth)

```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('title', 'Q4 Budget Update');
formData.append('category', 'Budget');
formData.append('source', 'Finance Dept');

const response = await fetch('https://ackindex.com/api/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include', // Include auth cookies
});

const result = await response.json();
if (result.success) {
  console.log('Upload successful!', result.entry);
}
```

### React Hook Example

```typescript
import useSWR from 'swr';

function useCivicEntries(category?: string) {
  const url = category 
    ? `/api/entries?category=${category}`
    : '/api/entries';
    
  const { data, error, isLoading } = useSWR(url, fetcher);
  
  return {
    entries: data,
    isLoading,
    isError: error,
  };
}
```

## CORS

CORS is enabled for all origins on public endpoints.

**Allowed Origins:** `*`  
**Allowed Methods:** `GET, POST, OPTIONS`  
**Allowed Headers:** `Content-Type, Authorization`

## Webhooks (Future)

Coming soon: webhooks for real-time notifications when new documents are published.

## GraphQL (Future)

A GraphQL API may be added in future versions for more flexible querying.

## Support

For API questions or issues:
- GitHub Issues: [github.com/your-org/ackindex](https://github.com)
- Email: support@ackindex.com

## Changelog

### v1.0.0 (October 2025)
- Initial API release
- GET /api/entries endpoint
- POST /api/upload endpoint
- Category filtering
- Basic rate limiting
