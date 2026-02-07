# OpenClaw Session Browser

A web-based browser for viewing and analyzing OpenClaw session files.

## Features

- **List View**: Browse all sessions sorted by date/time
- **Session Details**: Click on any session to view detailed event logs
- **Event Types**: View messages, tool calls, thinking blocks, and more
- **Color-Coded**: Different event types are visually distinguished
- **Token Usage**: See token statistics for each session

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to:
```
http://localhost:3000
```

## Development

For auto-reload during development:
```bash
npm run dev
```

## Project Structure

```
openclaw-session-browser/
├── public/               # Frontend files
│   ├── index.html        # Main HTML
│   ├── styles.css        # Styling
│   └── app.js            # Frontend JavaScript
├── server.js             # Express server
└── package.json          # Dependencies
```

## Session File Format

### sessions.json
Contains metadata for all sessions including:
- Session ID and timestamps
- Channel and chat type
- Model and provider information
- Token usage statistics

### .jsonl Files
Event logs in JSON Lines format with events such as:
- `session` - Session initialization
- `message` - User/assistant messages
- `model_change` - Model configuration changes
- `custom` - Custom events and metadata
- Tool calls and results

## API Endpoints

- `GET /api/sessions` - List all sessions with metadata
- `GET /api/sessions/:sessionId` - Get detailed events for a specific session
