# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenClaw Session Browser is a web-based tool for viewing and analyzing OpenClaw session files. It consists of an Express backend that serves session data from `~/.openclaw/agents/main/sessions` and a vanilla JavaScript frontend for browsing and searching sessions.

## Key Commands

```bash
# Install dependencies
npm install

# Run the server (production)
npm start

# Run with auto-reload (development)
npm run dev
```

The app runs on `http://localhost:3000` by default.

## Architecture

### Data Source Location
The server reads session files from `~/.openclaw/agents/main/sessions` (defined in server.js line 14). This is the live OpenClaw installation directory, NOT a local copy.

### Session File Handling Strategy

The codebase implements a **dual-source session loading** approach to handle cases where sessions exist as `.jsonl` files but are missing from `sessions.json`:

1. **Primary source**: `sessions.json` - Contains rich metadata (model, tokens, channel, etc.)
2. **Fallback source**: Direct `.jsonl` file scanning - Extracts basic info from first line when metadata is missing

This is handled in `/api/sessions` endpoint (server.js lines 17-99):
- First loads all sessions from `sessions.json`
- Then scans for `.jsonl` files not in the metadata
- Parses first line of orphaned files to extract timestamp and session ID
- Marks orphaned sessions with `fromFile: true` flag

Sessions missing metadata are displayed with "(no metadata)" label in the UI.

### Search Implementation

**Two-tier search system:**

1. **Cross-session search** (`/api/search` endpoint):
   - Searches across ALL `.jsonl` files on the server
   - Case-insensitive string matching on serialized JSON events
   - Returns up to 10 matches per session
   - Robust error handling: skips invalid JSON lines and continues on file errors

2. **In-session filtering** (client-side):
   - Filters the loaded `currentEvents` array in memory
   - Updates event count display dynamically
   - No server round-trip required

### Frontend State Management

The frontend uses simple global state variables (app.js lines 3-6):
- `currentSessions` - All sessions from server
- `currentEvents` - Events for currently viewed session
- `currentSessionId` - Currently displayed session
- `sortAscending` - Sort direction toggle state

Sorting is handled **client-side** after fetching from server, allowing instant toggle without network requests.

### Event Rendering System

Events are rendered using a type-based dispatch pattern (`renderEvent()` function):
- Checks `event.type` and delegates to specialized renderers
- Each event type has distinct visual styling (border colors)
- **Critical**: All content MUST be HTML-escaped via `escapeHtml()` to prevent injection attacks (fixes dark mode bug caused by unescaped HTML in session content)

## OpenClaw Session File Format

### sessions.json Structure
JSON object where each key is a session identifier (e.g., `"agent:main:main"`) containing:
- `sessionId` - UUID for the session
- `updatedAt` - Unix timestamp in milliseconds
- `model`, `modelProvider` - AI model information
- `totalTokens`, `inputTokens`, `outputTokens` - Usage stats
- `chatType`, `channel` - Communication context
- `displayName` - Human-readable session name

### .jsonl Event Format
JSON Lines format (one JSON object per line) with event types:
- `session` - Session initialization with `id`, `timestamp`, `cwd`
- `message` - User/assistant messages with `role` and `content` array
- `model_change` - Model configuration changes
- `custom` - Custom events with `customType` and `data`
- Tool calls embedded in message content as `toolCall` type items

## API Endpoints

- `GET /api/sessions` - List all sessions (from both sources)
- `GET /api/sessions/:sessionId` - Get all events for a session
- `GET /api/search?q=<query>` - Search across all sessions

## Important Implementation Notes

### HTML Escaping
Always escape user content and session data before rendering to prevent XSS. The `escapeHtml()` utility (app.js, bottom of file) must be used for:
- Event type names
- Tool names and arguments
- Tool results
- Custom event data
- Any JSON stringified content

### Error Handling in Search
The search endpoint must be resilient to:
- Invalid JSON lines (common in large sessions)
- Malformed .jsonl files
- File read errors
One bad file should never break the entire search.

### Client-Side vs Server-Side Operations
- **Server-side**: Loading sessions, reading files, cross-session search
- **Client-side**: Sorting, in-session filtering, event rendering
This split keeps the server simple while providing instant UI feedback for operations on loaded data.
