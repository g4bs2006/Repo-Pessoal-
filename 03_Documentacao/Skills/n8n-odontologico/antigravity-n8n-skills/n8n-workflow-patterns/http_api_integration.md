# HTTP API Integration Pattern

**Use Case**: Fetch data from REST APIs, transform it, and use it in workflows.

---

## Pattern Structure

```
Trigger â†’ HTTP Request â†’ [Transform] â†’ [Action] â†’ [Error Handler]
```

**Key Characteristic**: External data fetching with error handling

---

## Core Components

### 1. Trigger
**Options**:
- **Schedule** - Periodic fetching (most common)
- **Webhook** - Triggered by external event
- **Manual** - On-demand execution

### 2. HTTP Request Node
**Purpose**: Call external REST APIs

**Configuration**:
```javascript
{
  method: "GET",                    // GET, POST, PUT, DELETE, PATCH
  url: "https://api.example.com/users",
  authentication: "predefinedCredentialType",
  sendQuery: true,
  queryParameters: {
    "page": "={{$json.page}}",
    "limit": "100"
  },
  sendHeaders: true,
  headerParameters: {
    "Accept": "application/json",
    "X-API-Version": "v1"
  }
}
```

### 3. Response Processing
**Purpose**: Extract and transform API response data

**Typical flow**:
```
HTTP Request â†’ Code (parse) â†’ Set (map fields) â†’ Action
```

### 4. Action
**Common actions**:
- Store in database
- Send to another API
- Create notifications
- Update spreadsheet

### 5. Error Handler
**Purpose**: Handle API failures gracefully

**Error Trigger Workflow**:
```
Error Trigger â†’ Log Error â†’ Notify Admin â†’ Retry Logic (optional)
```

---

## Common Use Cases

### 1. Data Fetching & Storage
**Flow**: Schedule â†’ HTTP Request â†’ Transform â†’ Database

**Example** (Fetch GitHub issues):
```
1. Schedule (every hour)
2. HTTP Request
   - Method: GET
   - URL: https://api.github.com/repos/owner/repo/issues
   - Auth: Bearer Token
   - Query: state=open
3. Code (filter by labels)
4. Set (map to database schema)
5. Postgres (upsert issues)
```

**Response Handling**:
```javascript
// Code node - filter issues
const issues = $input.all();
return issues
  .filter(item => item.json.labels.some(l => l.name === 'bug'))
  .map(item => ({
    json: {
      id: item.json.id,
      title: item.json.title,
      created_at: item.json.created_at
    }
  }));
```

### 2. API to API Integration
**Flow**: Trigger â†’ Fetch from API A â†’ Transform â†’ Send to API B

**Example** (Jira to Slack):
```
1. Schedule (every 15 minutes)
2. HTTP Request (GET Jira tickets updated today)
3. IF (check if tickets exist)
4. Set (format for Slack)
5. HTTP Request (POST to Slack webhook)
```

### 3. Data Enrichment
**Flow**: Trigger â†’ Fetch base data â†’ Call enrichment API â†’ Combine â†’ Store

**Example** (Enrich contacts with company data):
```
1. Postgres (SELECT new contacts)
2. Code (extract company domains)
3. HTTP Request (call Clearbit API for each domain)
4. Set (combine contact + company data)
5. Postgres (UPDATE contacts with enrichment)
```

### 4. Monitoring & Alerting
**Flow**: Schedule â†’ Check API health â†’ IF unhealthy â†’ Alert

**Example** (API health check):
```
1. Schedule (every 5 minutes)
2. HTTP Request (GET /health endpoint)
3. IF (status !== 200 OR response time > 2000ms)
4. Slack (alert #ops-team)
5. PagerDuty (create incident)
```

### 5. Batch Processing
**Flow**: Trigger â†’ Fetch large dataset â†’ Split in Batches â†’ Process â†’ Loop

**Example** (Process all users):
```
1. Manual Trigger
2. HTTP Request (GET /api/users?limit=1000)
3. Split In Batches (100 items per batch)
4. HTTP Request (POST /api/process for each batch)
5. Wait (2 seconds between batches - rate limiting)
6. Loop (back to step 4 until all processed)
```

---

## Authentication Methods

### 1. None (Public APIs)
```javascript
{
  authentication: "none"
}
```

### 2. Bearer Token (Most Common)
**Setup**: Create credential
```javascript
{
  authentication: "predefinedCredentialType",
  nodeCredentialType: "httpHeaderAuth",
  headerAuth: {
    name: "Authorization",
    value: "Bearer YOUR_TOKEN"
  }
}
```

**Access in workflow**:
```javascript
{
  authentication: "predefinedCredentialType",
  nodeCredentialType: "httpHeaderAuth"
}
```

### 3. API Key (Header or Query)
**Header auth**:
```javascript
{
  sendHeaders: true,
  headerParameters: {
    "X-API-Key": "={{$credentials.apiKey}}"
  }
}
```

**Query auth**:
```javascript
{
  sendQuery: true,
  queryParameters: {
    "api_key": "***REMOVIDO***"
  }
}
```

### 4. Basic Auth
**Setup**: Create "Basic Auth" credential
```javascript
{
  authentication: "predefinedCredentialType",
  nodeCredentialType: "httpBasicAuth"
}
```

### 5. OAuth2
**Setup**: Create OAuth2 credential with:
- Authorization URL
- Token URL
- Client ID
- Client Secret
- Scopes

```javascript
{
  authentication: "predefinedCredentialType",
  nodeCredentialType: "oAuth2Api"
}
```

---

## Handling API Responses

### Success Response (200-299)
**Default**: Data flows to next node

**Access response**:
```javascript
// Entire response
{{$json}}

// Specific fields
{{$json.data.id}}
{{$json.results[0].name}}
```

### Pagination

#### Pattern 1: Offset-based
```
1. Set (initialize: page=1, has_more=true)
2. HTTP Request (GET /api/items?page={{$json.page}})
3. Code (check if more pages)
4. IF (has_more === true)
   â””â†’ Set (increment page) â†’ Loop to step 2
```

**Code node** (check pagination):
```javascript
const items = $input.first().json;
const currentPage = $json.page || 1;

return [{
  json: {
    items: items.results,
    page: currentPage + 1,
    has_more: items.next !== null
  }
}];
```

#### Pattern 2: Cursor-based
```
1. HTTP Request (GET /api/items)
2. Code (extract next_cursor)
3. IF (next_cursor exists)
   â””â†’ Set (cursor={{$json.next_cursor}}) â†’ Loop to step 1
```

#### Pattern 3: Link Header
```javascript
// Code node - parse Link header
const linkHeader = $input.first().json.headers['link'];
const hasNext = linkHeader && linkHeader.includes('rel="next"');

return [{
  json: {
    items: $input.first().json.body,
    has_next: hasNext,
    next_url: hasNext ? parseNextUrl(linkHeader) : null
  }
}];
```

### Error Responses (400-599)

**Configure HTTP Request**:
```javascript
{
  continueOnFail: true,  // Don't stop workflow on error
  ignoreResponseCode: true  // Get response even on error
}
```

**Handle errors**:
```
HTTP Request (continueOnFail: true)
  â†’ IF (check error)
    â”œâ”€ [Success Path]
    â””â”€ [Error Path] â†’ Log â†’ Retry or Alert
```

**IF condition**:
```javascript
{{$json.error}} is empty
// OR
{{$json.statusCode}} < 400
```

---

## Rate Limiting

### Pattern 1: Wait Between Requests
```
Split In Batches (1 item per batch)
  â†’ HTTP Request
  â†’ Wait (1 second)
  â†’ Loop
```

### Pattern 2: Exponential Backoff
```javascript
// Code node
const maxRetries = 3;
let retryCount = $json.retryCount || 0;

if ($json.error && retryCount < maxRetries) {
  const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

  return [{
    json: {
      ...$json,
      retryCount: retryCount + 1,
      waitTime: delay
    }
  }];
}
```

### Pattern 3: Respect Rate Limit Headers
```javascript
// Code node - check rate limit
const headers = $input.first().json.headers;
const remaining = parseInt(headers['x-ratelimit-remaining'] || '999');
const resetTime = parseInt(headers['x-ratelimit-reset'] || '0');

if (remaining < 10) {
  const now = Math.floor(Date.now() / 1000);
  const waitSeconds = resetTime - now;

  return [{
    json: {
      shouldWait: true,
      waitSeconds: Math.max(waitSeconds, 0)
    }
  }];
}

return [{ json: { shouldWait: false } }];
```

---

## Request Configuration

### GET Request
```javascript
{
  method: "GET",
  url: "https://api.example.com/users",
  sendQuery: true,
  queryParameters: {
    "page": "1",
    "limit": "100",
    "filter": "active"
  }
}
```

### POST Request (JSON Body)
```javascript
{
  method: "POST",
  url: "https://api.example.com/users",
  sendBody: true,
  bodyParametersJson: JSON.stringify({
    name: "={{$json.name}}",
    email: "={{$json.email}}",
    role: "user"
  })
}
```

### POST Request (Form Data)
```javascript
{
  method: "POST",
  url: "https://api.example.com/upload",
  sendBody: true,
  bodyParametersUi: {
    parameter: [
      { name: "file", value: "={{$json.fileData}}" },
      { name: "filename", value: "={{$json.filename}}" }
    ]
  },
  sendHeaders: true,
  headerParameters: {
    "Content-Type": "multipart/form-data"
  }
}
```

### PUT/PATCH Request (Update)
```javascript
{
  method: "PATCH",
  url: "https://api.example.com/users/={{$json.userId}}",
  sendBody: true,
  bodyParametersJson: JSON.stringify({
    status: "active",
    last_updated: "={{$now}}"
  })
}
```

### DELETE Request
```javascript
{
  method: "DELETE",
  url: "https://api.example.com/users/={{$json.userId}}"
}
```

---

## Error Handling Patterns

### Pattern 1: Retry on Failure
```
HTTP Request (continueOnFail: true)
  â†’ IF (error occurred)
    â””â†’ Wait (5 seconds)
    â””â†’ HTTP Request (retry)
```

### Pattern 2: Fallback API
```
HTTP Request (Primary API, continueOnFail: true)
  â†’ IF (failed)
    â””â†’ HTTP Request (Fallback API)
```

### Pattern 3: Error Trigger Workflow
**Main Workflow**:
```
HTTP Request â†’ Process Data
```

**Error Workflow**:
```
Error Trigger
  â†’ Set (extract error details)
  â†’ Slack (alert team)
  â†’ Database (log error for analysis)
```

### Pattern 4: Circuit Breaker
```javascript
// Code node - circuit breaker logic
const failures = $json.recentFailures || 0;
const threshold = 5;

if (failures >= threshold) {
  throw new Error('Circuit breaker open - too many failures');
}

return [{ json: { canProceed: true } }];
```

---

## Response Transformation

### Extract Nested Data
```javascript
// Code node
const response = $input.first().json;

return response.data.items.map(item => ({
  json: {
    id: item.id,
    name: item.attributes.name,
    email: item.attributes.contact.email
  }
}));
```

### Flatten Arrays
```javascript
// Code node - flatten nested array
const items = $input.all();
const flattened = items.flatMap(item =>
  item.json.results.map(result => ({
    json: {
      parent_id: item.json.id,
      ...result
    }
  }))
);

return flattened;
```

### Combine Multiple API Responses
```
HTTP Request 1 (users)
  â†’ Set (store users)
  â†’ HTTP Request 2 (orders for each user)
  â†’ Merge (combine users + orders)
```

---

## Testing & Debugging

### 1. Test with Manual Trigger
Replace Schedule with Manual Trigger for testing

### 2. Use Postman/Insomnia First
- Test API outside n8n
- Understand response structure
- Verify authentication

### 3. Log Responses
```javascript
// Code node - log for debugging
console.log('API Response:', JSON.stringify($input.first().json, null, 2));
return $input.all();
```

### 4. Check Execution Data
- View node output in n8n UI
- Check headers, body, status code
- Verify data structure

### 5. Use Binary Data Properly
For file downloads:
```javascript
{
  method: "GET",
  url: "https://api.example.com/download/file.pdf",
  responseFormat: "file",  // Important for binary data
  outputPropertyName: "data"
}
```

---

## Performance Optimization

### 1. Parallel Requests
Use **Split In Batches** with multiple items:
```
Set (create array of IDs)
  â†’ Split In Batches (10 items per batch)
  â†’ HTTP Request (processes all 10 in parallel)
  â†’ Loop
```

### 2. Caching
```
IF (check cache exists)
  â”œâ”€ [Cache Hit] â†’ Use cached data
  â””â”€ [Cache Miss] â†’ HTTP Request â†’ Store in cache
```

### 3. Conditional Fetching
Only fetch if data changed:
```
HTTP Request (GET with If-Modified-Since header)
  â†’ IF (status === 304)
    â””â”€ Use existing data
  â†’ IF (status === 200)
    â””â”€ Process new data
```

### 4. Batch API Calls
If API supports batch operations:
```javascript
{
  method: "POST",
  url: "https://api.example.com/batch",
  bodyParametersJson: JSON.stringify({
    requests: $json.items.map(item => ({
      method: "GET",
      url: `/users/${item.id}`
    }))
  })
}
```

---

## Common Gotchas

### 1. âŒ Wrong: Hardcoded URLs
```javascript
url: "https://api.example.com/prod/users"
```

### âœ… Correct: Use environment variables
```javascript
url: "={{$env.API_BASE_URL}}/users"
```

### 2. âŒ Wrong: Credentials in parameters
```javascript
headerParameters: {
  "Authorization": "***REMOVIDO***"  // âŒ Exposed!
}
```

### âœ… Correct: Use credentials system
```javascript
authentication: "predefinedCredentialType",
nodeCredentialType: "httpHeaderAuth"
```

### 3. âŒ Wrong: No error handling
```javascript
HTTP Request â†’ Process (fails if API down)
```

### âœ… Correct: Handle errors
```javascript
HTTP Request (continueOnFail: true) â†’ IF (error) â†’ Handle
```

### 4. âŒ Wrong: Blocking on large responses
Processing 10,000 items synchronously

### âœ… Correct: Use batching
```
Split In Batches (100 items) â†’ Process â†’ Loop
```

---

## Real Template Examples

From n8n template library (892 API integration templates):

**GitHub to Notion**:
```
Schedule â†’ HTTP Request (GitHub API) â†’ Transform â†’ HTTP Request (Notion API)
```

**Weather to Slack**:
```
Schedule â†’ HTTP Request (Weather API) â†’ Set (format) â†’ Slack
```

**CRM Sync**:
```
Schedule â†’ HTTP Request (CRM A) â†’ Transform â†’ HTTP Request (CRM B)
```

Use `search_templates({query: "http api"})` to find more!

---

## Checklist for API Integration

### Planning
- [ ] Test API with Postman/curl first
- [ ] Understand response structure
- [ ] Check rate limits
- [ ] Review authentication method
- [ ] Plan error handling

### Implementation
- [ ] Use credentials (never hardcode)
- [ ] Configure proper HTTP method
- [ ] Set correct headers (Content-Type, Accept)
- [ ] Handle pagination if needed
- [ ] Add query parameters properly

### Error Handling
- [ ] Set continueOnFail: true if needed
- [ ] Check response status codes
- [ ] Implement retry logic
- [ ] Add Error Trigger workflow
- [ ] Alert on failures

### Performance
- [ ] Use batching for large datasets
- [ ] Add rate limiting if needed
- [ ] Consider caching
- [ ] Test with production load

### Security
- [ ] Use HTTPS only
- [ ] Store secrets in credentials
- [ ] Validate API responses
- [ ] Use environment variables

---

## Summary

**Key Points**:
1. **Authentication** via credentials system (never hardcode)
2. **Error handling** is critical (continueOnFail + IF checks)
3. **Pagination** for large datasets
4. **Rate limiting** to respect API limits
5. **Transform responses** to match your needs

**Pattern**: Trigger â†’ HTTP Request â†’ Transform â†’ Action â†’ Error Handler

**Related**:
- [webhook_processing.md](webhook_processing.md) - Receiving HTTP requests
- [database_operations.md](database_operations.md) - Storing API data
