# False Positives Guide

When validation warnings are acceptable and how to handle them.

---

## What Are False Positives?

**Definition**: Validation warnings that are technically "issues" but acceptable in your specific use case.

**Key insight**: Not all warnings need to be fixed!

Many warnings are context-dependent:
- ~40% of warnings are acceptable in specific use cases
- Using `ai-friendly` profile reduces false positives by 60%

---

## Philosophy

### âœ… Good Practice
```
1. Run validation with 'runtime' profile
2. Fix all ERRORS
3. Review each WARNING
4. Decide if acceptable for your use case
5. Document why you accepted it
6. Deploy with confidence
```

### âŒ Bad Practice
```
1. Ignore all warnings blindly
2. Use 'minimal' profile to avoid warnings
3. Deploy without understanding risks
```

---

## Common False Positives

### 1. Missing Error Handling

**Warning**:
```json
{
  "type": "best_practice",
  "message": "No error handling configured",
  "suggestion": "Add continueOnFail: true and retryOnFail: true"
}
```

#### When Acceptable

**âœ… Development/Testing Workflows**
```javascript
// Testing workflow - failures are obvious
{
  "name": "Test Slack Integration",
  "nodes": [{
    "type": "n8n-nodes-base.slack",
    "parameters": {
      "resource": "message",
      "operation": "post",
      "channel": "#test"
      // No error handling - OK for testing
    }
  }]
}
```

**Reasoning**: You WANT to see failures during testing.

**âœ… Non-Critical Notifications**
```javascript
// Nice-to-have notification
{
  "name": "Optional Slack Notification",
  "parameters": {
    "channel": "#general",
    "text": "FYI: Process completed"
    // If this fails, no big deal
  }
}
```

**Reasoning**: Notification failure doesn't affect core functionality.

**âœ… Manual Trigger Workflows**
```javascript
// Manual workflow - user is watching
{
  "nodes": [{
    "type": "n8n-nodes-base.webhook",
    "parameters": {
      "path": "manual-test"
      // No error handling - user will retry manually
    }
  }]
}
```

**Reasoning**: User is present to see and handle errors.

#### When to Fix

**âŒ Production Automation**
```javascript
// BAD: Critical workflow without error handling
{
  "name": "Process Customer Orders",
  "nodes": [{
    "type": "n8n-nodes-base.postgres",
    "parameters": {
      "query": "INSERT INTO orders..."
      // âŒ Should have error handling!
    }
  }]
}
```

**Fix**:
```javascript
{
  "parameters": {
    "query": "INSERT INTO orders...",
    "continueOnFail": true,
    "retryOnFail": true,
    "maxTries": 3,
    "waitBetweenTries": 1000
  }
}
```

**âŒ Critical Integrations**
```javascript
// BAD: Payment processing without error handling
{
  "name": "Process Payment",
  "type": "n8n-nodes-base.stripe"
  // âŒ Payment failures MUST be handled!
}
```

---

### 2. No Retry Logic

**Warning**:
```json
{
  "type": "best_practice",
  "message": "External API calls should retry on failure",
  "suggestion": "Add retryOnFail: true with exponential backoff"
}
```

#### When Acceptable

**âœ… APIs with Built-in Retry**
```javascript
// Stripe has its own retry mechanism
{
  "type": "n8n-nodes-base.stripe",
  "parameters": {
    "resource": "charge",
    "operation": "create"
    // Stripe SDK retries automatically
  }
}
```

**âœ… Idempotent Operations**
```javascript
// GET request - safe to retry manually if needed
{
  "method": "GET",
  "url": "https://api.example.com/status"
  // Read-only, no side effects
}
```

**âœ… Local/Internal Services**
```javascript
// Internal API with high reliability
{
  "url": "http://localhost:3000/process"
  // Local service, failures are rare and obvious
}
```

#### When to Fix

**âŒ Flaky External APIs**
```javascript
// BAD: Known unreliable API without retries
{
  "url": "https://unreliable-api.com/data"
  // âŒ Should retry!
}

// GOOD:
{
  "url": "https://unreliable-api.com/data",
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 2000
}
```

**âŒ Non-Idempotent Operations**
```javascript
// BAD: POST without retry - may lose data
{
  "method": "POST",
  "url": "https://api.example.com/create"
  // âŒ Could timeout and lose data
}
```

---

### 3. Missing Rate Limiting

**Warning**:
```json
{
  "type": "best_practice",
  "message": "API may have rate limits",
  "suggestion": "Add rate limiting or batch requests"
}
```

#### When Acceptable

**âœ… Internal APIs**
```javascript
// Internal microservice - no rate limits
{
  "url": "http://internal-api/process"
  // Company controls both ends
}
```

**âœ… Low-Volume Workflows**
```javascript
// Runs once per day
{
  "trigger": {
    "type": "n8n-nodes-base.cron",
    "parameters": {
      "mode": "everyDay",
      "hour": 9
    }
  },
  "nodes": [{
    "type": "n8n-nodes-base.httpRequest",
    "parameters": {
      "url": "https://api.example.com/daily-report"
      // Once per day = no rate limit concerns
    }
  }]
}
```

**âœ… APIs with Server-Side Limits**
```javascript
// API returns 429 and n8n handles it
{
  "url": "https://api.example.com/data",
  "options": {
    "response": {
      "response": {
        "neverError": false  // Will error on 429
      }
    }
  },
  "retryOnFail": true  // Retry on 429
}
```

#### When to Fix

**âŒ High-Volume Public APIs**
```javascript
// BAD: Loop hitting rate-limited API
{
  "nodes": [{
    "type": "n8n-nodes-base.splitInBatches",
    "parameters": {
      "batchSize": 100
    }
  }, {
    "type": "n8n-nodes-base.httpRequest",
    "parameters": {
      "url": "https://api.github.com/..."
      // âŒ GitHub has strict rate limits!
    }
  }]
}

// GOOD: Add rate limiting
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.github.com/...",
    "options": {
      "batching": {
        "batch": {
          "batchSize": 10,
          "batchInterval": 1000  // 1 second between batches
        }
      }
    }
  }
}
```

---

### 4. Unbounded Database Queries

**Warning**:
```json
{
  "type": "performance",
  "message": "SELECT without LIMIT can return massive datasets",
  "suggestion": "Add LIMIT clause or use pagination"
}
```

#### When Acceptable

**âœ… Small Known Datasets**
```javascript
// Config table with ~10 rows
{
  "query": "SELECT * FROM app_config"
  // Known to be small, no LIMIT needed
}
```

**âœ… Aggregation Queries**
```javascript
// COUNT/SUM operations
{
  "query": "SELECT COUNT(*) as total FROM users WHERE active = true"
  // Aggregation, not returning rows
}
```

**âœ… Development/Testing**
```javascript
// Testing with small dataset
{
  "query": "SELECT * FROM test_users"
  // Test database has 5 rows
}
```

#### When to Fix

**âŒ Production Queries on Large Tables**
```javascript
// BAD: User table could have millions of rows
{
  "query": "SELECT * FROM users"
  // âŒ Could return millions of rows!
}

// GOOD: Add LIMIT
{
  "query": "SELECT * FROM users LIMIT 1000"
}

// BETTER: Use pagination
{
  "query": "SELECT * FROM users WHERE id > {{$json.lastId}} LIMIT 1000"
}
```

---

### 5. Missing Input Validation

**Warning**:
```json
{
  "type": "best_practice",
  "message": "Webhook doesn't validate input data",
  "suggestion": "Add IF node to validate required fields"
}
```

#### When Acceptable

**âœ… Internal Webhooks**
```javascript
// Webhook from your own backend
{
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "internal-trigger"
    // Your backend already validates
  }
}
```

**âœ… Trusted Sources**
```javascript
// Webhook from Stripe (cryptographically signed)
{
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "stripe-webhook",
    "authentication": "headerAuth"
    // Stripe signature validates authenticity
  }
}
```

#### When to Fix

**âŒ Public Webhooks**
```javascript
// BAD: Public webhook without validation
{
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "public-form-submit"
    // âŒ Anyone can send anything!
  }
}

// GOOD: Add validation
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "name": "Validate Input",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$json.body.email}}",
              "operation": "isNotEmpty"
            },
            {
              "value1": "={{$json.body.email}}",
              "operation": "regex",
              "value2": "^[^@]+@[^@]+\\.[^@]+$"
            }
          ]
        }
      }
    }
  ]
}
```

---

### 6. Hardcoded Credentials

**Warning**:
```json
{
  "type": "security",
  "message": "Credentials should not be hardcoded",
  "suggestion": "Use n8n credential system"
}
```

#### When Acceptable

**âœ… Public APIs (No Auth)**
```javascript
// Truly public API with no secrets
{
  "url": "https://api.ipify.org"
  // No credentials needed
}
```

**âœ… Demo/Example Workflows**
```javascript
// Example workflow in documentation
{
  "url": "https://example.com/api",
  "headers": {
    "Authorization": "***REMOVIDO***"
  }
  // Clearly marked as example
}
```

#### When to Fix (Always!)

**âŒ Real Credentials**
```javascript
// BAD: Real API key in workflow
{
  "headers": {
    "Authorization": "***REMOVIDO***"
  }
  // âŒ NEVER hardcode real credentials!
}

// GOOD: Use credentials system
{
  "authentication": "headerAuth",
  "credentials": {
    "headerAuth": {
      "id": "credential-id",
      "name": "My API Key"
    }
  }
}
```

---

## Validation Profile Strategies

### Strategy 1: Progressive Strictness

**Development**:
```javascript
validate_node({
  nodeType: "nodes-base.slack",
  config,
  profile: "ai-friendly"  // Fewer warnings during development
})
```

**Pre-Production**:
```javascript
validate_node({
  nodeType: "nodes-base.slack",
  config,
  profile: "runtime"  // Balanced validation
})
```

**Production Deployment**:
```javascript
validate_node({
  nodeType: "nodes-base.slack",
  config,
  profile: "strict"  // All warnings, review each one
})
```

### Strategy 2: Profile by Workflow Type

**Quick Automations**:
- Profile: `ai-friendly`
- Accept: Most warnings
- Fix: Only errors + security warnings

**Business-Critical Workflows**:
- Profile: `strict`
- Accept: Very few warnings
- Fix: Everything possible

**Integration Testing**:
- Profile: `minimal`
- Accept: All warnings (just testing connections)
- Fix: Only errors that prevent execution

---

## Decision Framework

### Should I Fix This Warning?

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Is it a SECURITY warning?       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ YES â†’ Always fix                â”‚
â”‚ NO  â†’ Continue                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Is this a production workflow?  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ YES â†’ Continue                  â”‚
â”‚ NO  â†’ Probably acceptable       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Does it handle critical data?   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ YES â†’ Fix the warning           â”‚
â”‚ NO  â†’ Continue                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Is there a known workaround?    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ YES â†’ Acceptable if documented  â”‚
â”‚ NO  â†’ Fix the warning           â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Documentation Template

When accepting a warning, document why:

```javascript
// workflows/customer-notifications.json

{
  "nodes": [{
    "name": "Send Slack Notification",
    "type": "n8n-nodes-base.slack",
    "parameters": {
      "channel": "#notifications"
      // ACCEPTED WARNING: No error handling
      // Reason: Non-critical notification, failures are acceptable
      // Reviewed: 2025-10-20
      // Reviewer: Engineering Team
    }
  }]
}
```

---

## Known n8n Issues

### Issue #304: IF Node Metadata Warning

**Warning**:
```json
{
  "type": "metadata_incomplete",
  "message": "IF node missing conditions.options metadata",
  "node": "IF"
}
```

**Status**: False positive for IF v2.2+

**Why it occurs**: Auto-sanitization adds metadata, but validation runs before sanitization

**What to do**: Ignore - metadata is added on save

### Issue #306: Switch Branch Count

**Warning**:
```json
{
  "type": "configuration_mismatch",
  "message": "Switch has 3 rules but 4 output connections",
  "node": "Switch"
}
```

**Status**: False positive when using "fallback" mode

**Why it occurs**: Fallback creates extra output

**What to do**: Ignore if using fallback intentionally

### Issue #338: Credential Validation in Test Mode

**Warning**:
```json
{
  "type": "credentials_invalid",
  "message": "Cannot validate credentials without execution context"
}
```

**Status**: False positive during static validation

**Why it occurs**: Credentials validated at runtime, not build time

**What to do**: Ignore - credentials are validated when workflow runs

---

## Summary

### Always Fix
- âŒ Security warnings
- âŒ Hardcoded credentials
- âŒ SQL injection risks
- âŒ Production workflow errors

### Usually Fix
- âš ï¸ Error handling (production)
- âš ï¸ Retry logic (external APIs)
- âš ï¸ Input validation (public webhooks)
- âš ï¸ Rate limiting (high volume)

### Often Acceptable
- âœ… Error handling (dev/test)
- âœ… Retry logic (internal APIs)
- âœ… Rate limiting (low volume)
- âœ… Query limits (small datasets)

### Always Acceptable
- âœ… Known n8n issues (#304, #306, #338)
- âœ… Auto-sanitization warnings
- âœ… Metadata completeness (auto-fixed)

**Golden Rule**: If you accept a warning, document WHY.

**Related Files**:
- **[SKILL.md](SKILL.md)** - Main validation guide
- **[ERROR_CATALOG.md](ERROR_CATALOG.md)** - Error types and fixes
