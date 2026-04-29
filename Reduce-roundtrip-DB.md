# Performance Optimization Log

This document records the recent optimization work for channel read performance, so future development can quickly understand what was changed and why.

## Scope

Primary target:
- Endpoint: `POST /channel-messages/:channelId/read`

Observed problem:
- Backend latency was very high (initially around 8s in user-observed end-to-end calls).

## Root Causes Found

1. Duplicate auth guard execution on the read endpoint.
2. Extra profile guard lookup for an endpoint that only needed `userId`.
3. Multiple sequential database round trips for mark-as-read logic.
4. DB region distance (Ohio) amplified round-trip cost.

## What Was Changed

### 1) Dependency Injection Fix

- Fixed `UnknownDependenciesException` related to `ServerMemberGuard` by importing `MemberModule` into `MessageModule`.

### 2) Guard Path Optimization

- Removed endpoint-level `@UseGuards(AuthGuard)` on read route because auth is already handled globally.
- Added a metadata-based skip decorator for profile guard:
  - `@SkipProfileGuard()` on read route.
  - `ProfileGuard` now checks metadata and bypasses profile fetch when allowed.

Result:
- Removed unnecessary guard work from this hot path.

### 3) Read Use Case Refactor

- Added `executeByUserId(...)` path in `MarkChannelAsReadUseCase`.
- Kept compatibility path for existing websocket/profile-based flow.
- Unified internal logic so REST and websocket can share behavior safely.

### 4) Database Round-Trip Consolidation (Main Win)

Old approach (multi-trip):
1. Find member by identity.
2. Read existing `ChannelRead`.
3. Upsert `ChannelRead`.

New approach (single-trip):
- Added repository method: `markChannelAsReadByIdentity(channelId, serverId, identity)`
- Implemented one atomic SQL statement with:
  - `WITH target_member AS (...)`
  - `INSERT ... ON CONFLICT (...) DO UPDATE`
  - `RETURNING ...`

Impact:
- Replaced 3 sequential DB round trips with 1 round trip.

### 5) SQL Insert Stability Fix

- Fixed Postgres NOT NULL violation (`23502`) by generating `_id` explicitly with `randomUUID()` for insert path.

### 6) Instrumentation Lifecycle

- Added detailed PERF logs during benchmark phase (AuthGuard / ProfileGuard / UseCase / Controller).
- After confirming stable gains, removed PERF logs to reduce console noise.

## Before vs After

For `POST /channel-messages/:channelId/read`:

- Before optimization phases: often multi-second backend latency.
- After guard + query consolidation: stabilized around sub-1s (~0.69-0.92s in repeated checks).

## Compatibility Notes

- Websocket-related flow remains compatible.
- Identity matching supports both `userId` and `profileId` where needed.

## Files Touched (Key)

- `src/message/message.module.ts`
- `src/common/decorators/skip-profile-guard.decorator.ts`
- `src/common/guards/auth.guard.ts`
- `src/common/guards/profile.guard.ts`
- `src/message/channel-msg/presenter/controllers/channel-message.controller.ts`
- `src/message/channel-msg/application/usecases/mark-channel-as-read.usecase.ts`
- `src/message/channel-msg/domain/repositories/channel-message.repository.interface.ts`
- `src/message/channel-msg/infrastructure/repositories/prisma-channel-message.repository.ts`

## Remaining Opportunities

1. Optimize `GET /channel-messages?channelId=...` further (still slower than ideal).
2. Optional feature flag for future temporary perf instrumentation.
3. Consider infrastructure locality/caching if cross-region DB latency remains a bottleneck.

## Practical Rule Going Forward

For high-frequency endpoints:
- Avoid redundant guards.
- Avoid fetching data that endpoint does not need.
- Prefer atomic SQL for write paths that currently require multiple sequential ORM calls.
- Keep benchmark logs temporary and remove after validation.


* When multiple round trips are merged into one, the orchestration is not removed but shifted from the application layer (use case) to the database (infrastructure layer).