# Code Refactoring & Performance Optimization Report

## Executive Summary

This document outlines the refactoring, performance optimizations, and improvement suggestions for the Narvo API codebase. The analysis covers backend Python services built with FastAPI.

---

## 1. Critical Issues Found

### 1.1 Import Organization (30+ E402 violations)
**Issue**: Module-level imports scattered throughout files instead of at the top.
**Impact**: Reduces code readability, violates PEP 8, can cause circular import issues.
**Files Affected**: `server.py`, `lib/auth.py`, `routes/aggregators.py`, `routes/me.py`, `routes/tts.py`

**Fix**: Move all imports to the top of each file, organized in standard order:
1. Standard library imports
2. Third-party imports  
3. Local application imports

### 1.2 Unused Imports (4+ F401 violations)
**Issue**: Dead code from unused imports increases load time and confusion.
**Files Affected**: 
- `lib/cache_registry.py`: `typing.Any`
- `lib/vector_client.py`: `typing.Any`
- `routes/admin.py`: `typing.List`
- `routes/aggregators.py`: `datetime.datetime`, `datetime.timezone`

**Fix**: Remove unused imports.

---

## 2. Performance Optimizations

### 2.1 Async/Await Anti-patterns
**Issue**: Using `asyncio.create_task()` without proper error handling in startup (server.py:357).
**Risk**: Unhandled exceptions in background tasks can crash the application.

**Recommendation**:
```python
# Current (risky)
asyncio.create_task(_startup_warmup())

# Improved
async def _safe_startup_warmup():
    try:
        await _startup_warmup_inner()
    except Exception as e:
        logger.error("Startup warmup failed: %s", e, exc_info=True)

asyncio.create_task(_safe_startup_warmup())
```

### 2.2 In-Memory Cache Thread Safety
**Issue**: `_memory_times` dict in `lib/ratelimit.py` is not thread-safe for concurrent access.
**Impact**: Race conditions under high load can cause incorrect rate limiting.

**Recommendation**: Use `asyncio.Lock` or switch entirely to Redis-based rate limiting.

### 2.3 Database Connection Pooling
**Issue**: Supabase client instantiated repeatedly without connection pooling.
**Files**: Multiple service files call `get_supabase_db()`.

**Recommendation**: Implement singleton pattern with connection pooling for database clients.

### 2.4 HTTP Client Reuse
**Issue**: Multiple `aiohttp.ClientSession` creations across services.
**Files**: `news_service.py`, `aggregator_service.py`, `article_scraper_service.py`

**Recommendation**: Use a shared HTTP client session from `lib/http_client.py` consistently.

---

## 3. Code Quality Improvements

### 3.1 Magic Numbers and Constants
**Issue**: Hardcoded values scattered throughout codebase.
**Examples**:
- `RSS_FEEDS` list in `news_service.py` (70+ feeds)
- Cache TTL values: 60, 120, 300, 600 seconds
- Rate limits: 5, 120 requests

**Recommendation**: Extract to configuration module:
```python
# config.py
CACHE_TTL = {
    "aggregators": 600,
    "news_feeds": 120,
    "story_details": 300,
}
RATE_LIMITS = {
    "auth": 5,
    "api": 120,
}
```

### 3.2 Error Handling Consistency
**Issue**: Mixed patterns - some use try/except, others rely on middleware.
**Files**: All service files

**Recommendation**: Standardize error handling with custom exception classes:
```python
class ServiceError(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
```

### 3.3 Type Annotations
**Issue**: Missing type hints in many functions.
**Impact**: Reduces IDE support, makes refactoring harder.

**Recommendation**: Add complete type annotations to all public functions.

### 3.4 Docstrings
**Issue**: Inconsistent documentation coverage.
**Recommendation**: Add Google-style docstrings to all public APIs.

---

## 4. Architectural Recommendations

### 4.1 Dependency Injection
**Current**: Direct imports and global state (`_ratelimit_instance`, `_index`).
**Recommendation**: Use FastAPI's dependency injection system for better testability.

### 4.2 Configuration Management
**Current**: Environment variables accessed directly via `os.environ.get()`.
**Recommendation**: Use Pydantic Settings for validated configuration:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_jwt_secret: str
    redis_url: str
    environment: str = "development"
```

### 4.3 Logging Strategy
**Current**: JSON logging implemented but inconsistent usage.
**Recommendation**: 
- Add structured logging context (request_id, user_id) automatically
- Implement log levels based on environment
- Add request/response logging middleware

### 4.4 Testing Coverage
**Current**: Tests exist but coverage unknown.
**Recommendation**: 
- Add pytest-cov for coverage reporting
- Target 80%+ coverage for critical paths
- Add integration tests for API endpoints

---

## 5. Security Enhancements

### 5.1 Input Validation
**Issue**: Some endpoints lack input validation.
**Recommendation**: Use Pydantic models for all request/response validation.

### 5.2 SQL Injection Prevention
**Status**: Using Supabase client which provides parameterized queries - GOOD.
**Recommendation**: Audit any raw SQL queries if added in future.

### 5.3 Authentication Flow
**Current**: JWT verification supports both HS* and RS*/ES* algorithms - GOOD.
**Recommendation**: Add token expiration caching to reduce decode overhead.

### 5.4 Rate Limiting
**Current**: Path-based rate limiting with fail-open/fail-closed modes - GOOD.
**Recommendation**: Add user-tier based limits (free vs premium).

---

## 6. Specific File Recommendations

### server.py
- Move all imports to top (lines 55-62)
- Extract middleware classes to separate `lib/middleware.py`
- Reduce file size (368 lines) by moving route registrations

### lib/auth.py
- Move `from fastapi import Request` to top (line 111)
- Add type hints to all functions
- Consider adding JWT caching layer

### lib/ratelimit.py
- Add thread-safety for in-memory fallback
- Extract path classification to configuration

### services/news_service.py
- Extract RSS feed list to external configuration (JSON/YAML)
- Reduce file size (817 lines) by splitting into sub-modules
- Add async semaphore for concurrent feed fetching

### routes/*.py
- Fix all E402 violations
- Remove unused imports
- Standardize response formats

---

## 7. Implementation Priority

### High Priority (Week 1)
1. Fix import organization (E402 violations)
2. Remove unused imports (F401 violations)
3. Add error handling to async background tasks
4. Implement thread-safe rate limiting

### Medium Priority (Week 2-3)
1. Extract configuration to centralized module
2. Implement Pydantic Settings
3. Add comprehensive type annotations
4. Standardize error handling

### Low Priority (Week 4+)
1. Refactor large service files
2. Implement dependency injection
3. Add comprehensive test coverage
4. Performance profiling and optimization

---

## 8. Metrics to Track

- **Code Quality**: Ruff/Pyright error count (target: 0)
- **Performance**: P95 latency, requests/second
- **Reliability**: Error rate, uptime percentage
- **Coverage**: Test coverage percentage (target: 80%+)
- **Maintainability**: Cyclomatic complexity, file size distribution

---

## Conclusion

The codebase shows solid fundamentals with good security practices and modern async architecture. The primary opportunities are:
1. Code organization and cleanup
2. Performance optimization through better resource management
3. Enhanced type safety and documentation
4. Improved test coverage

Implementing these recommendations will improve maintainability, reduce bugs, and enhance performance.
