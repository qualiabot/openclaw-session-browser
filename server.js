const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const SESSIONS_DIR = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');

// Get list of all sessions with metadata
app.get('/api/sessions', async (req, res) => {
  try {
    const sessionsJsonPath = path.join(SESSIONS_DIR, 'sessions.json');
    let sessionsMetadata = {};

    // Try to read sessions.json if it exists
    try {
      const sessionsData = await fs.readFile(sessionsJsonPath, 'utf-8');
      sessionsMetadata = JSON.parse(sessionsData);
    } catch (err) {
      console.warn('sessions.json not found or invalid, scanning .jsonl files');
    }

    // Scan all .jsonl files in the directory
    const files = await fs.readdir(SESSIONS_DIR);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

    const sessionsList = [];
    const processedIds = new Set();

    // First, add sessions from sessions.json
    for (const [key, session] of Object.entries(sessionsMetadata)) {
      sessionsList.push({
        key,
        sessionId: session.sessionId,
        updatedAt: session.updatedAt,
        chatType: session.chatType,
        channel: session.channel || session.lastChannel,
        displayName: session.displayName,
        model: session.model,
        provider: session.modelProvider,
        totalTokens: session.totalTokens,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        origin: session.origin,
      });
      processedIds.add(session.sessionId);
    }

    // Then, add any .jsonl files not in sessions.json
    for (const file of jsonlFiles) {
      const sessionId = file.replace('.jsonl', '');

      if (!processedIds.has(sessionId)) {
        // Read first line to get basic info
        const filePath = path.join(SESSIONS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const firstLine = content.split('\n')[0];

        if (firstLine) {
          try {
            const firstEvent = JSON.parse(firstLine);
            const stats = await fs.stat(filePath);

            sessionsList.push({
              key: `file:${sessionId}`,
              sessionId: sessionId,
              updatedAt: new Date(firstEvent.timestamp || stats.mtime).getTime(),
              chatType: 'unknown',
              channel: 'unknown',
              displayName: `Session ${sessionId.substring(0, 8)}...`,
              model: null,
              provider: null,
              totalTokens: null,
              inputTokens: null,
              outputTokens: null,
              origin: null,
              fromFile: true, // Mark sessions parsed from files
            });
          } catch (err) {
            console.error(`Error parsing ${file}:`, err.message);
          }
        }
      }
    }

    // Return unsorted - sorting will be done on client side
    res.json(sessionsList);
  } catch (error) {
    console.error('Error reading sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed session log
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);

    const data = await fs.readFile(sessionPath, 'utf-8');
    const events = data
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    res.json(events);
  } catch (error) {
    console.error('Error reading session log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search across all sessions
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = q.toLowerCase();
    const files = await fs.readdir(SESSIONS_DIR);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

    const results = [];

    for (const file of jsonlFiles) {
      const sessionId = file.replace('.jsonl', '');
      const filePath = path.join(SESSIONS_DIR, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        let matches = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Skip empty lines
          if (!line) continue;

          try {
            // Parse JSON first
            const event = JSON.parse(line);

            // Convert to string for searching
            const eventString = JSON.stringify(event).toLowerCase();

            // Check if this event matches the search term
            if (eventString.includes(searchTerm)) {
              matches.push({
                lineNumber: i + 1,
                event: event,
                snippet: line.substring(0, 200) + (line.length > 200 ? '...' : '')
              });

              // Limit matches per session
              if (matches.length >= 10) break;
            }
          } catch (parseErr) {
            // Skip lines that aren't valid JSON
            continue;
          }
        }

        if (matches.length > 0) {
          results.push({
            sessionId,
            matchCount: matches.length,
            matches: matches
          });
        }
      } catch (fileErr) {
        console.error(`Error reading file ${file}:`, fileErr.message);
        continue;
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error searching sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`OpenClaw Session Browser running at http://localhost:${PORT}`);
});
