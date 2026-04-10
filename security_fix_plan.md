# Security Vulnerability Fix Plan

## Executive Summary
This plan addresses 8 identified security vulnerabilities across the backend codebase, prioritized by risk level. Estimated total effort: **2-3 days**.

---

## Phase 1: Critical Fixes (Day 1)
*Immediate action required - High risk of exploitation*

### 1. JWT Algorithm Confusion Fix
**File:** `backend/lib/auth.py`  
**Risk:** High - Could allow authentication bypass  
**Effort:** 1 hour  

**Action Plan:**
- Remove fallback logic that attempts HS256 verification on non-HS tokens
- Explicitly specify allowed algorithms in `jwt.decode()`
- Add algorithm validation before decoding

**Code Changes:**
```python
# BEFORE (vulnerable):
try:
    payload = jwt.decode(token, JWKS, algorithms=["RS256"])
except jwt.InvalidSignatureError:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])

# AFTER (fixed):
header = jwt.get_unverified_header(token)
if header.get("alg") == "RS256":
    payload = jwt.decode(token, JWKS, algorithms=["RS256"])
elif header.get("alg") == "HS256":
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
else:
    raise HTTPException(401, "Unsupported algorithm")
```

**Testing:**
- Unit tests for RS256 and HS256 tokens
- Test rejection of unsupported algorithms (e.g., "none", "HS384")
- Verify no regression in existing auth flows

---

### 2. Auth Rate Limiting Implementation
**Files:** `backend/lib/ratelimit.py`, `backend/server.py`  
**Risk:** High - Enables brute force attacks  
**Effort:** 2 hours  

**Action Plan:**
- Extend rate limiter to cover auth endpoints (`/auth/login`, `/auth/token`)
- Implement stricter limits for auth (e.g., 5 requests/minute vs 100/minute for API)
- Add IP-based and user-based rate limiting for auth

**Code Changes:**
```python
# In server.py, add auth-specific routes to rate limiting:
app.add_middleware(RateLimitMiddleware, redis_url=settings.redis_url, paths=[
    "/api/v1/*",
    "/auth/login",      # NEW
    "/auth/token",      # NEW
    "/auth/register",   # NEW
])

# In ratelimit.py, add auth-specific limits:
AUTH_LIMIT = 5  # 5 requests per minute
API_LIMIT = 100

def get_limit_for_path(path: str) -> int:
    if path.startswith("/auth/"):
        return AUTH_LIMIT
    return API_LIMIT
```

**Testing:**
- Verify 6th request to `/auth/login` within 1 minute returns 429
- Test rate limit reset after 1 minute
- Ensure normal API endpoints unaffected

---

## Phase 2: High-Medium Fixes (Day 2)

### 3. CORS Configuration Hardening
**File:** `backend/server.py`  
**Risk:** Medium - Potential data leakage  
**Effort:** 1 hour  

**Action Plan:**
- Remove automatic localhost addition in production
- Require explicit origin configuration
- Validate origins against allowlist

**Code Changes:**
```python
# BEFORE:
allowed_origins = settings.cors_origins.split(",")
if not settings.cors_origins:
    allowed_origins = ["*"]
allowed_origins.extend(["http://localhost:3000", "http://localhost:8080"])

# AFTER:
allowed_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if not allowed_origins:
    raise ValueError("CORS_ORIGINS must be explicitly configured")
if settings.environment == "development":
    allowed_origins.extend(["http://localhost:3000", "http://localhost:8080"])
```

**Testing:**
- Verify production fails without CORS_ORIGINS set
- Test localhost works only in development
- Confirm invalid origins rejected

---

### 4. Rate Limiter Fail-Closed for Critical Endpoints
**File:** `backend/lib/ratelimit.py`  
**Risk:** Medium - DoS vulnerability during Redis outages  
**Effort:** 1.5 hours  

**Action Plan:**
- Implement fail-closed behavior for auth endpoints
- Allow fail-open only for non-critical API routes
- Add circuit breaker pattern for Redis connection

**Code Changes:**
```python
# BEFORE:
except Exception:
    logger.warning("Redis error, allowing request")
    return await call_next(request)

# AFTER:
CRITICAL_PATHS = ["/auth/login", "/auth/token", "/auth/register"]

except Exception as e:
    logger.error(f"Redis error: {e}")
    if any(request.url.path.startswith(p) for p in CRITICAL_PATHS):
        logger.warning("Failing closed for critical endpoint")
        return JSONResponse({"detail": "Service temporarily unavailable"}, status_code=503)
    return await call_next(request)
```

**Testing:**
- Simulate Redis failure, verify auth endpoints return 503
- Confirm non-critical endpoints still work (fail-open)
- Test Redis reconnection recovery

---

### 5. Input Validation Enhancement
**File:** `backend/routes/me.py`  
**Risk:** Medium - XSS/data integrity issues  
**Effort:** 1.5 hours  

**Action Plan:**
- Add length limits on all user inputs
- Implement consistent sanitization
- Validate content types and formats

**Code Changes:**
```python
from pydantic import Field, validator

class UserProfileUpdate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=50)
    bio: str = Field(default="", max_length=500)
    
    @validator('display_name')
    def sanitize_name(cls, v):
        v = html.escape(v.strip())
        if not re.match(r'^[\w\s\-\.]+$', v):
            raise ValueError("Invalid characters in display name")
        return v

@app.patch("/me/profile")
async def update_profile(profile: UserProfileUpdate, ...):
    # Existing implementation
```

**Testing:**
- Test 51-character display name rejected
- Verify script tags escaped in bio
- Confirm special characters validated

---

## Phase 3: Low Priority & Hardening (Day 3)

### 6. Webhook Verification Simplification
**File:** `backend/lib/qstash_verify.py`  
**Risk:** Low - Complexity increases bug surface  
**Effort:** 1 hour  

**Action Plan:**
- Simplify signature verification logic
- Add clear error messages for each failure mode
- Document expected webhook payload structure

---

### 7. Sensitive Data Logging Prevention
**File:** `backend/server.py`  
**Risk:** Low - Potential credential leakage in logs  
**Effort:** 0.5 hours  

**Action Plan:**
- Filter sensitive fields from request logs
- Add logging middleware to redact passwords/tokens

**Code Changes:**
```python
SENSITIVE_FIELDS = ["password", "token", "authorization", "cookie"]

def sanitize_log_data(data: dict) -> dict:
    return {k: "***REDACTED***" if k.lower() in SENSITIVE_FIELDS else v 
            for k, v in data.items()}
```

---

### 8. Remove Hardcoded Default Origins
**File:** `backend/server.py`  
**Risk:** Low - Configuration drift risk  
**Effort:** 0.5 hours  

**Action Plan:**
- Move all default values to settings/environment variables
- Document required environment variables in README

---

## Testing Strategy

### Automated Tests
- Add unit tests for each fix (target: 90% coverage on changed files)
- Integration tests for auth flow with rate limiting
- Security-focused test suite for OWASP Top 10 scenarios

### Manual Testing
- Penetration testing on auth endpoints
- CORS misconfiguration attempts
- Rate limiting bypass attempts

### Regression Testing
- Full test suite run before deployment
- Staging environment validation

---

## Deployment Plan

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Security review completed
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

### Deployment Steps
1. Deploy to staging environment
2. Run security scan (OWASP ZAP)
3. Monitor for 24 hours
4. Deploy to production with canary release (10% traffic)
5. Full rollout after 48 hours monitoring

### Rollback Plan
- Feature flags for rate limiting changes
- Database migrations are backward compatible
- Quick rollback via Kubernetes deployment revert

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Critical vulnerabilities | 0 | Security scan results |
| Auth brute force attempts blocked | 100% | Rate limit logs |
| Invalid JWT rejections | 100% | Auth error logs |
| CORS misconfigurations | 0 | Security audit |
| Test coverage | >90% | Coverage reports |

---

## Timeline

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| Day 1 | JWT fix, Auth rate limiting | PR #1, Unit tests |
| Day 2 | CORS, Rate limiter fail-closed, Input validation | PR #2, Integration tests |
| Day 3 | Remaining fixes, Documentation | PR #3, Security report |
| Day 4 | Testing & QA | Test results, Staging deployment |
| Day 5 | Production deployment | Live fixes, Monitoring dashboard |

---

## Resources Required

- **Developers:** 1-2 backend engineers
- **Security Review:** 1 security engineer (2 hours)
- **QA:** 1 QA engineer (4 hours)
- **Tools:** OWASP ZAP, Burp Suite (optional)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing auth flow | Extensive testing, canary deployment |
| Redis outage impacts users | Fail-closed only for critical endpoints |
| CORS breaks frontend | Staging validation with frontend team |
| Rate limiting false positives | Gradual rollout, monitoring dashboards |

---

## Post-Fix Actions

1. **Documentation Update:**
   - Update SECURITY.md with new controls
   - Document environment variables
   - Add runbook for rate limit tuning

2. **Monitoring:**
   - Alert on rate limit triggers (>100/hour)
   - Alert on JWT validation failures
   - Dashboard for auth metrics

3. **Training:**
   - Security awareness session for team
   - Code review checklist update

4. **Future Improvements:**
   - Implement WAF rules
   - Add anomaly detection for auth patterns
   - Regular security audits (quarterly)

---

*Plan created: $(date)*  
*Next review: After Phase 1 completion*
