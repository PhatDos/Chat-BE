# Gemini AI Content Moderation System

## Overview

This document describes the complete content moderation flow using Google's Gemini API. The system automatically moderates text, images, and PDF documents when messages are created in channels.

## Flow Diagram

```
Create Message (WS)
    ↓
Channel Message Gateway → Create Use Case
    ↓
Event: channel-message.created
    ↓
Event Handler (channel-message.handler.ts)
    ├─ 1. Emit to WebSocket
    ├─ 2. Send notifications
    └─ 3. Enqueue to moderation queue
       ↓
  BullMQ Queue (Redis)
       ↓
  Moderation Worker (ts-node)
       ├─ Call Gemini API
       ├─ Analyze text/image/PDF
       └─ Update Message.isFlagged & Message.flagReason
       ↓
  [Future] Emit WS event to update client UI
```

## Architecture

### 1. **Queue Definition** (`src/redis/moderation.queue.ts`)

Defines the moderation job data structure:

```typescript
export type ModerationJobData = {
  messageId: string;
  content: string;
  fileType?: 'text' | 'img' | 'pdf';
  fileUrl?: string;
};
```

### 2. **Event Handler** (`src/message/channel-msg/application/events/handlers/channel-message.handler.ts`)

Listens for `channel-message.created` event and:
- Emits message to WebSocket
- Sends notifications to other members
- **Enqueues message for moderation** with content, fileType, and fileUrl

```typescript
await moderationQueue.add('scan-message', {
  messageId: message.id,
  content: message.content,
  fileType: message.fileType,
  fileUrl: message.fileUrl,
});
```

### 3. **Moderation Worker** (`src/workers/moderation.worker.ts`)

A standalone BullMQ worker that:
- Processes jobs from the moderation queue
- Calls Gemini API to analyze content
- Updates the database with moderation results

#### Key Features:
- **Text Moderation**: Uses Gemini to detect toxic, hateful, or inappropriate content
- **Image Moderation**: Uses Gemini vision to analyze images for harmful content
- **PDF Moderation**: Analyzes document text for violations
- **Fail-safe**: On error, defaults to not flagging (isFlagged = false)

### 4. **Gemini Moderation Service** (`src/ai/gemini-moderation.service.ts`)

NestJS service (optional, for future API usage):
- Wraps Gemini API calls
- Provides `moderateText()`, `moderateImage()`, `moderatePdf()` methods
- Can be injected into other modules

## Moderation Categories
The Gemini AI looks for:

### Text
- Hate speech or discrimination
- Violence or gore
- Sexual or NSFW content
- Spam or phishing
- Misinformation
- Harassment or bullying
- Vietnamese slurs (e.g., "ngu")
- Illegal activities

### Images
- Hate speech symbols
- Violence or gore
- Sexual or NSFW content
- Harmful or illegal activities
- Dangerous materials

### PDFs/Documents
- Same as text, plus:
- Copyright violations
- Malware instructions
- Scams or misinformation

## Example Workflow

### Step 1: Create Message
User sends message in channel via WebSocket:
```javascript
socket.emit('channel:message:create', {
  tempId: '123',
  content: 'Hello world!',
  channelId: 'ch_123',
  memberId: 'member_123',
  fileType: 'text'
});
```

### Step 2: Database Record Created
Message is created with:
```json
{
  "id": "msg_123",
  "content": "Hello world!",
  "isFlagged": false,
  "flagReason": null,
  "fileType": "text"
}
```

### Step 3: Event Emitted
`channel-message.created` event triggers handler which enqueues:
```json
{
  "messageId": "msg_123",
  "content": "Hello world!",
  "fileType": "text"
}
```

### Step 4: Worker Processes Job
Worker receives job and calls Gemini:
```
Prompt: "Analyze this text: 'Hello world!' for harmful content..."
Gemini Response: {
  "isFlagged": false,
  "reason": null
}
```

### Step 5: Database Updated
```sql
UPDATE "Message"
SET
  "isFlagged" = false,
  "flagReason" = null
WHERE "_id" = 'msg_123'
```

### Step 6: Emit WS Update (TODO)
Future: Emit moderation result to frontend:
```javascript
socket.emit('channel:message:moderated', {
  messageId: 'msg_123',
  isFlagged: false,
  reason: null
});
```

## Gemini API Response Format

Gemini returns structured JSON:
```json
{
  "isFlagged": boolean,
  "reason": "string or null",
  "category": "string or null"
}
```

Parser extracts JSON using regex: `/\{[\s\S]*\}/`

## Debugging

### View Worker Logs

When running `npm run worker:moderation:dev`:

```
🔍 Scanning message: msg_123
📝 Content: Hello world!...
📎 File type: text
✅ SAFE: msg_123
💾 DB updated: isFlagged=false
```

Or if flagged:
```
⚠️  FLAGGED: msg_123
📋 Reason: Contains hateful language
💾 DB updated: isFlagged=true, flagReason=Contains hateful language
```