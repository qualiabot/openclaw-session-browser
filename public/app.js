const API_BASE = 'http://localhost:3000/api';

let currentSessions = [];
let currentEvents = [];
let currentSessionId = null;
let sortAscending = true; // true = oldest first, false = newest first

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadSessions();

  document.getElementById('back-button').addEventListener('click', () => {
    showSessionsList();
  });

  // Search functionality
  const searchInput = document.getElementById('search-input');
  const clearButton = document.getElementById('clear-search');

  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length === 0) {
      clearButton.classList.add('hidden');
      loadSessions();
      return;
    }

    clearButton.classList.remove('hidden');

    // Debounce search
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  });

  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    clearButton.classList.add('hidden');
    loadSessions();
  });

  // Event search functionality
  const eventSearchInput = document.getElementById('event-search-input');
  const clearEventButton = document.getElementById('clear-event-search');

  let eventSearchTimeout;
  eventSearchInput.addEventListener('input', (e) => {
    clearTimeout(eventSearchTimeout);
    const query = e.target.value.trim();

    if (query.length === 0) {
      clearEventButton.classList.add('hidden');
      displaySessionDetail(currentSessionId, currentEvents);
      return;
    }

    clearEventButton.classList.remove('hidden');

    // Debounce search
    eventSearchTimeout = setTimeout(() => {
      filterEvents(query);
    }, 300);
  });

  clearEventButton.addEventListener('click', () => {
    eventSearchInput.value = '';
    clearEventButton.classList.add('hidden');
    displaySessionDetail(currentSessionId, currentEvents);
  });

  // Sort toggle functionality
  const sortToggle = document.getElementById('sort-toggle');
  sortToggle.addEventListener('click', () => {
    sortAscending = !sortAscending;
    updateSortButton();

    // Re-sort and display current sessions
    if (currentSessions.length > 0) {
      sortSessions(currentSessions);
      displaySessionsList(currentSessions);
    }
  });
});

// Update sort button text
function updateSortButton() {
  const sortToggle = document.getElementById('sort-toggle');
  if (sortAscending) {
    sortToggle.innerHTML = '↓ Oldest First';
  } else {
    sortToggle.innerHTML = '↑ Newest First';
  }
}

// Sort sessions based on current sort direction
function sortSessions(sessions) {
  sessions.sort((a, b) => {
    if (sortAscending) {
      return a.updatedAt - b.updatedAt; // Oldest first
    } else {
      return b.updatedAt - a.updatedAt; // Newest first
    }
  });
}

// Load all sessions
async function loadSessions() {
  try {
    const response = await fetch(`${API_BASE}/sessions`);
    currentSessions = await response.json();
    sortSessions(currentSessions);
    updateSortButton();
    displaySessionsList(currentSessions);
  } catch (error) {
    console.error('Error loading sessions:', error);
    document.getElementById('sessions-container').innerHTML =
      '<div class="loading">Error loading sessions. Please ensure the server is running.</div>';
  }
}

// Perform search
async function performSearch(query) {
  try {
    const container = document.getElementById('sessions-container');
    container.innerHTML = '<div class="loading">Searching...</div>';

    const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    const results = await response.json();

    displaySearchResults(results, query);
  } catch (error) {
    console.error('Error searching:', error);
    document.getElementById('sessions-container').innerHTML =
      '<div class="loading">Error performing search.</div>';
  }
}

// Display search results
function displaySearchResults(results, query) {
  const container = document.getElementById('sessions-container');

  if (results.length === 0) {
    container.innerHTML = `
      <div class="search-results-header">
        No results found for "${escapeHtml(query)}"
      </div>
    `;
    return;
  }

  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);

  let html = `
    <div class="search-results-header">
      Found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in ${results.length} session${results.length !== 1 ? 's' : ''} for "${escapeHtml(query)}"
    </div>
  `;

  html += results.map(result => {
    const session = currentSessions.find(s => s.sessionId === result.sessionId);
    const sessionName = session?.displayName || result.sessionId;
    const date = session ? new Date(session.updatedAt).toLocaleString() : '';

    return `
      <div class="session-card" onclick="loadSessionDetail('${result.sessionId}')">
        <div class="session-header">
          <div>
            <div class="session-title">
              ${escapeHtml(sessionName)}
              <span class="match-count">${result.matchCount} match${result.matchCount !== 1 ? 'es' : ''}</span>
            </div>
            ${date ? `<div class="session-date">${date}</div>` : ''}
          </div>
        </div>
        <div class="session-meta">
          ${session?.channel ? `<span class="meta-badge channel">${session.channel}</span>` : ''}
          ${session?.model ? `<span class="meta-badge model">${session.model}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// Display sessions list
function displaySessionsList(sessions) {
  const container = document.getElementById('sessions-container');

  if (sessions.length === 0) {
    container.innerHTML = '<div class="loading">No sessions found.</div>';
    return;
  }

  const html = sessions.map(session => {
    const date = new Date(session.updatedAt);
    const formattedDate = date.toLocaleString();

    return `
      <div class="session-card" onclick="loadSessionDetail('${session.sessionId}')">
        <div class="session-header">
          <div>
            <div class="session-title">
              ${session.displayName || session.key || 'Untitled Session'}
              ${session.fromFile ? '<span style="color: #e74c3c; font-size: 12px; margin-left: 8px;">(no metadata)</span>' : ''}
            </div>
            <div class="session-date">${formattedDate}</div>
          </div>
        </div>
        <div class="session-meta">
          ${session.channel ? `<span class="meta-badge channel">${session.channel}</span>` : ''}
          ${session.chatType && session.chatType !== 'unknown' ? `<span class="meta-badge">${session.chatType}</span>` : ''}
          ${session.model ? `<span class="meta-badge model">${session.model}</span>` : ''}
          ${session.totalTokens ? `<span class="meta-badge">${session.totalTokens.toLocaleString()} tokens</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// Load session detail
async function loadSessionDetail(sessionId) {
  try {
    document.getElementById('sessions-list').classList.add('hidden');
    document.getElementById('session-detail').classList.remove('hidden');

    // Clear event search
    document.getElementById('event-search-input').value = '';
    document.getElementById('clear-event-search').classList.add('hidden');

    const response = await fetch(`${API_BASE}/sessions/${sessionId}`);
    const events = await response.json();

    // Store current events for filtering
    currentEvents = events;
    currentSessionId = sessionId;

    displaySessionDetail(sessionId, events);
  } catch (error) {
    console.error('Error loading session detail:', error);
    document.getElementById('events-container').innerHTML =
      '<div class="loading">Error loading session events.</div>';
  }
}

// Filter events based on search query
function filterEvents(query) {
  const searchTerm = query.toLowerCase();

  const filteredEvents = currentEvents.filter(event => {
    const eventString = JSON.stringify(event).toLowerCase();
    return eventString.includes(searchTerm);
  });

  // Update info to show filtered count
  const session = currentSessions.find(s => s.sessionId === currentSessionId);
  const infoDiv = document.getElementById('session-info');

  if (session) {
    const date = new Date(session.updatedAt);
    infoDiv.innerHTML = `
      <strong>Session:</strong> ${session.displayName || currentSessionId}<br>
      <strong>Updated:</strong> ${date.toLocaleString()}<br>
      <strong>Events:</strong> ${filteredEvents.length} of ${currentEvents.length} (filtered)
    `;
  }

  // Display filtered events
  const container = document.getElementById('events-container');

  if (filteredEvents.length === 0) {
    container.innerHTML = `
      <div class="search-results-header">
        No events found matching "${escapeHtml(query)}"
      </div>
    `;
    return;
  }

  const html = `
    <div class="search-results-header">
      Found ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} matching "${escapeHtml(query)}"
    </div>
  ` + filteredEvents.map(event => renderEvent(event)).join('');

  container.innerHTML = html;
}

// Display session detail
function displaySessionDetail(sessionId, events) {
  // Update session info header
  const session = currentSessions.find(s => s.sessionId === sessionId);
  const infoDiv = document.getElementById('session-info');

  if (session) {
    const date = new Date(session.updatedAt);
    infoDiv.innerHTML = `
      <strong>Session:</strong> ${session.displayName || sessionId}<br>
      <strong>Updated:</strong> ${date.toLocaleString()}<br>
      <strong>Events:</strong> ${events.length}
    `;
  }

  // Display events
  const container = document.getElementById('events-container');
  const html = events.map(event => renderEvent(event)).join('');
  container.innerHTML = html;
}

// Render individual event
function renderEvent(event) {
  const timestamp = new Date(event.timestamp).toLocaleTimeString();

  switch (event.type) {
    case 'message':
      return renderMessage(event, timestamp);
    case 'session':
      return renderSessionEvent(event, timestamp);
    case 'model_change':
      return renderModelChange(event, timestamp);
    case 'thinking_level_change':
      return renderThinkingLevel(event, timestamp);
    case 'custom':
      return renderCustomEvent(event, timestamp);
    default:
      return renderGenericEvent(event, timestamp);
  }
}

// Render message event
function renderMessage(event, timestamp) {
  const role = event.message?.role || 'unknown';
  const content = event.message?.content || [];

  let contentHtml = '';

  content.forEach(item => {
    if (item.type === 'text') {
      contentHtml += `<div class="text-content">${escapeHtml(item.text)}</div>`;
    } else if (item.type === 'thinking') {
      contentHtml += `
        <div class="thinking-content">
          <strong>Thinking:</strong>
          <pre>${escapeHtml(item.thinking)}</pre>
        </div>
      `;
    } else if (item.type === 'toolCall') {
      contentHtml += `
        <div class="tool-call-content">
          <div class="tool-call-name">Tool: ${escapeHtml(item.name)}</div>
          <div class="tool-arguments">
            <strong>Arguments:</strong>
            <pre>${escapeHtml(JSON.stringify(item.arguments, null, 2))}</pre>
          </div>
        </div>
      `;
    }
  });

  // Handle tool result messages
  if (role === 'toolResult') {
    const toolName = event.toolName || 'unknown';
    contentHtml = `
      <div class="tool-call-name">Tool Result: ${escapeHtml(toolName)}</div>
      <div class="tool-result">
        <pre>${typeof content === 'string' ? escapeHtml(content) : escapeHtml(JSON.stringify(content, null, 2))}</pre>
      </div>
    `;
  }

  return `
    <div class="event-card message">
      <div class="event-header">
        <div class="event-type">
          <span class="message-role ${role}">${role}</span>
        </div>
        <div class="event-timestamp">${timestamp}</div>
      </div>
      <div class="event-content">
        ${contentHtml}
      </div>
    </div>
  `;
}

// Render session event
function renderSessionEvent(event, timestamp) {
  return `
    <div class="event-card session">
      <div class="event-header">
        <div class="event-type">Session Start</div>
        <div class="event-timestamp">${timestamp}</div>
      </div>
      <div class="event-content">
        <strong>ID:</strong> ${event.id}<br>
        <strong>Working Directory:</strong> ${event.cwd || 'N/A'}
      </div>
    </div>
  `;
}

// Render model change event
function renderModelChange(event, timestamp) {
  return `
    <div class="event-card model_change">
      <div class="event-header">
        <div class="event-type">Model Change</div>
        <div class="event-timestamp">${timestamp}</div>
      </div>
      <div class="event-content">
        <strong>Provider:</strong> ${event.provider || 'N/A'}<br>
        <strong>Model:</strong> ${event.modelId || 'N/A'}
      </div>
    </div>
  `;
}

// Render thinking level change
function renderThinkingLevel(event, timestamp) {
  return `
    <div class="event-card custom">
      <div class="event-header">
        <div class="event-type">Thinking Level</div>
        <div class="event-timestamp">${timestamp}</div>
      </div>
      <div class="event-content">
        <strong>Level:</strong> ${event.thinkingLevel || 'N/A'}
      </div>
    </div>
  `;
}

// Render custom event
function renderCustomEvent(event, timestamp) {
  return `
    <div class="event-card custom">
      <div class="event-header">
        <div class="event-type">${escapeHtml(event.customType || 'Custom Event')}</div>
        <div class="event-timestamp">${timestamp}</div>
      </div>
      <div class="event-content">
        <pre>${escapeHtml(JSON.stringify(event.data, null, 2))}</pre>
      </div>
    </div>
  `;
}

// Render generic event
function renderGenericEvent(event, timestamp) {
  return `
    <div class="event-card">
      <div class="event-header">
        <div class="event-type">${escapeHtml(event.type)}</div>
        <div class="event-timestamp">${timestamp}</div>
      </div>
      <div class="event-content">
        <pre>${escapeHtml(JSON.stringify(event, null, 2))}</pre>
      </div>
    </div>
  `;
}

// Show sessions list
function showSessionsList() {
  document.getElementById('session-detail').classList.add('hidden');
  document.getElementById('sessions-list').classList.remove('hidden');
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
