const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_DIR = path.join(__dirname, '..');

// Clean Base app.js
function getCleanAppJs() {
  return `/**
 * MetaPulse Client Application
 * Premium Threads/Discussions Client for Meta Hackathon
 */

// Application State
const state = {
  currentUser: null,
  activeTab: 'for_you',
  activeCategory: 'all',
  threads: [],
  quotedThread: null,
  isLoading: false,
  postButtonStuck: false
};

// DOM Selectors
const elements = {
  threadsContainer: document.getElementById('threads-container'),
  feedLoader: document.getElementById('feed-loader'),
  tabForYou: document.getElementById('tab-for-you'),
  tabFollowing: document.getElementById('tab-following'),
  selectCategory: document.getElementById('select-category'),
  inlineComposeInput: document.getElementById('inline-compose-input'),
  btnInlineSubmit: document.getElementById('btn-inline-submit'),
  charCounter: document.getElementById('char-counter'),
  threadModal: document.getElementById('thread-modal'),
  btnOpenCompose: document.getElementById('btn-open-compose'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnCancelModal: document.getElementById('btn-cancel-modal'),
  btnPublishQuote: document.getElementById('btn-publish-quote'),
  quoteCommentInput: document.getElementById('quote-comment-input'),
  quotedThreadPreview: document.getElementById('quoted-thread-preview'),
  suggestedUsersList: document.getElementById('suggested-users-list'),
  widgetSearchInput: document.getElementById('widget-search-input'),
  userAvatar: document.getElementById('user-avatar'),
  userDisplayName: document.getElementById('user-display-name'),
  userHandle: document.getElementById('user-handle')
};

/**
 * Initialize application
 */
async function initApp() {
  await fetchCurrentUser();
  await fetchThreads();
  renderSuggestedUsers();
  attachEventListeners();
}

/**
 * Fetch authenticated user info
 */
async function fetchCurrentUser() {
  try {
    const res = await fetch('/api/me');
    state.currentUser = await res.json();
    if (elements.userDisplayName) elements.userDisplayName.textContent = state.currentUser.display_name;
    if (elements.userHandle) elements.userHandle.textContent = \`@\${state.currentUser.username}\`;
    if (elements.userAvatar) elements.userAvatar.src = state.currentUser.avatar_url;
  } catch (err) {
    console.warn('Could not fetch user session:', err);
  }
}

/**
 * Fetch feed threads
 */
let latestFetchId = 0;
async function fetchThreads() {
  const currentFetchId = ++latestFetchId;
  state.isLoading = true;
  if (elements.feedLoader) elements.feedLoader.style.display = 'flex';

  try {
    const url = \`/api/threads?tab=\${state.activeTab}&category=\${state.activeCategory}\`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(\`Server returned HTTP \${res.status}\`);
    }

    const data = await res.json();

    if (currentFetchId !== latestFetchId) {
      return;
    }

    state.threads = data.threads || [];
    renderThreads();
  } catch (err) {
    elements.threadsContainer.innerHTML = \`
      <div class="loading-state">
        <p style="color: var(--danger);">Failed to load threads: \${err.message}</p>
      </div>
    \`;
  } finally {
    state.isLoading = false;
    if (elements.feedLoader) elements.feedLoader.style.display = 'none';
  }
}

/**
 * Render threads into feed
 */
function renderThreads() {
  if (!state.threads.length) {
    elements.threadsContainer.innerHTML = \`
      <div class="loading-state">
        <p>No pulses found in this topic yet.</p>
      </div>
    \`;
    return;
  }

  elements.threadsContainer.innerHTML = state.threads.map((thread) => {
    const likeBtnId = \`btn-like-\${thread.id}\`;

    return \`
      <article class="thread-card" data-thread-id="\${thread.id}">
        <img src="\${thread.avatar_url}" alt="\${thread.display_name}" class="avatar-sm">
        <div style="flex: 1;">
          <header class="thread-header">
            <span class="display-name">\${escapeHtml(thread.display_name)}</span>
            \${thread.verified ? '<span class="verified-icon" title="Verified Creator"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>' : ''}
            <span class="handle">@\${escapeHtml(thread.username)}</span>
            <span class="timestamp">· \${formatTimeAgo(thread.created_at)}</span>
          </header>
          
          <div class="thread-content">\${escapeHtml(thread.content)}</div>
          
          \${thread.media_url ? \`
            <div class="thread-media">
              <img src="\${thread.media_url}" alt="Post attachment" loading="lazy">
            </div>
          \` : ''}

          <footer class="thread-footer">
            <button id="\${likeBtnId}" class="action-btn btn-like \${thread.is_liked ? 'liked' : ''}" data-action="like" data-id="\${thread.id}" aria-label="Like post">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span class="like-count">\${thread.likes_count}</span>
            </button>

            <button class="action-btn btn-reply" data-action="reply" data-id="\${thread.id}" aria-label="Reply">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span>\${thread.replies_count}</span>
            </button>

            <button class="action-btn btn-repost" data-action="quote" data-id="\${thread.id}" aria-label="Quote thread">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              <span>\${thread.reposts_count}</span>
            </button>

            <button class="action-btn btn-bookmark \${thread.is_bookmarked ? 'bookmarked' : ''}" data-action="bookmark" data-id="\${thread.id}" aria-label="Bookmark">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </footer>
        </div>
      </article>
    \`;
  }).join('');
}

/**
 * Handle thread card user interaction
 */
function handleThreadAction(e) {
  const btn = e.target.closest('.action-btn');
  if (!btn) return;

  const action = btn.dataset.action;
  const threadId = btn.dataset.id;
  const thread = state.threads.find(t => t.id === threadId);

  if (action === 'like') {
    toggleLike(threadId, btn);
  } else if (action === 'bookmark') {
    toggleBookmark(threadId, btn);
  } else if (action === 'quote' && thread) {
    openQuoteModal(thread);
  }
}

/**
 * Toggle like action
 */
async function toggleLike(threadId, btn) {
  const countEl = btn.querySelector('.like-count');
  let currentCount = parseInt(countEl.textContent, 10);

  try {
    const res = await fetch(\`/api/threads/\${threadId}/like\`, { method: 'POST' });
    const data = await res.json();

    if (data.liked) {
      btn.classList.add('liked');
      countEl.textContent = currentCount + 1;
    } else {
      btn.classList.remove('liked');
      countEl.textContent = Math.max(0, currentCount - 1);
    }
  } catch (err) {
    console.error('Like toggle failed:', err);
  }
}

/**
 * Toggle bookmark action
 */
async function toggleBookmark(threadId, btn) {
  try {
    const res = await fetch(\`/api/threads/\${threadId}/bookmark\`, { method: 'POST' });
    const data = await res.json();

    if (data.bookmarked) {
      btn.classList.add('bookmarked');
    } else {
      btn.classList.remove('bookmarked');
    }
  } catch (err) {
    console.error('Bookmark toggle failed:', err);
  }
}

/**
 * Open Quote Repost Modal
 */
function openQuoteModal(thread) {
  state.quotedThread = thread;

  elements.quotedThreadPreview.innerHTML = \`
    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
      <img src="\${thread.avatar_url}" alt="\${thread.display_name}" class="avatar-sm" style="width: 24px; height: 24px;">
      <span style="font-weight: 700; font-size: 13px;">\${escapeHtml(thread.display_name)}</span>
      <span style="color: var(--text-muted); font-size: 12px;">@\${escapeHtml(thread.username)}</span>
    </div>
    <div style="font-size: 13px; color: var(--text-secondary);">\${escapeHtml(thread.content)}</div>
  \`;

  elements.quoteCommentInput.value = '';
  elements.threadModal.style.display = 'flex';
}

/**
 * Publish Quote Repost
 */
async function handlePublishQuote() {
  const comment = elements.quoteCommentInput.value;

  try {
    const fullContent = \`\${comment}\\n\\n[Quoted @\${state.quotedThread.username}]: "\${state.quotedThread.content}"\`;
    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: fullContent, category: state.quotedThread.category })
    });

    if (res.ok) {
      elements.threadModal.style.display = 'none';
      await fetchThreads();
    }
  } catch (err) {
    console.error('Failed to publish quote:', err);
  }
}

/**
 * Handle new thread creation from inline composer
 */
async function handleCreateThread() {
  const content = elements.inlineComposeInput.value;

  if (!content || !content.trim()) return;

  try {
    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, category: state.activeCategory === 'all' ? 'general' : state.activeCategory })
    });

    if (res.ok) {
      elements.inlineComposeInput.value = '';
      elements.charCounter.textContent = '280';
      await fetchThreads();
    }
  } catch (err) {
    console.error('Failed to post thread:', err);
  }
}

/**
 * Render suggested creator profiles in sidebar
 */
function renderSuggestedUsers() {
  const creators = [
    { id: 'usr_ylecun', name: 'Yann LeCun', handle: 'ylecun', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
    { id: 'usr_zuck', name: 'Mark Zuckerberg', handle: 'markzuck', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
    { id: 'usr_sarah', name: 'Sarah Chen', handle: 'sarah_ml', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' }
  ];

  elements.suggestedUsersList.innerHTML = creators.map(c => \`
    <div class="suggested-user-row">
      <div class="suggested-user-info">
        <img src="\${c.avatar}" alt="\${c.name}" class="avatar-sm">
        <div class="user-meta">
          <span class="name">\${c.name}</span>
          <span class="handle">@\${c.handle}</span>
        </div>
      </div>
      <button class="btn-follow" data-user-id="\${c.id}" aria-label="Follow \${c.name}">Follow</button>
    </div>
  \`).join('');
}

/**
 * Handle follow button click
 */
async function handleFollow(e) {
  const btn = e.target.closest('.btn-follow');
  if (!btn || btn.disabled) return;
  btn.disabled = true;

  const userId = btn.dataset.userId;
  try {
    const res = await fetch(\`/api/users/\${userId}/follow\`, { method: 'POST' });
    const data = await res.json();

    btn.textContent = 'Following';
    btn.classList.add('following');
  } catch (err) {
    console.error('Follow failed:', err);
    btn.disabled = false;
  }
}

/**
 * Handle search bar input
 */
function handleSearch(e) {
  const query = e.target.value;

  // Client filter
  if (!query) {
    renderThreads();
    return;
  }
  const q = query.toLowerCase();
  const filtered = state.threads.filter(t => 
    t.content.toLowerCase().includes(q) || 
    t.username.toLowerCase().includes(q)
  );
  elements.threadsContainer.innerHTML = filtered.length ? filtered.map(t => \`
    <article class="thread-card">
      <div style="font-size: 14px; color: var(--text-primary);">\${escapeHtml(t.content)}</div>
    </article>
  \`).join('') : '<div class="loading-state"><p>No matching pulses.</p></div>';
}

/**
 * Setup UI Event Listeners
 */
function attachEventListeners() {
  // Feed tabs
  elements.tabForYou.addEventListener('click', () => {
    elements.tabForYou.classList.add('active');
    elements.tabFollowing.classList.remove('active');
    state.activeTab = 'for_you';
    fetchThreads();
  });

  elements.tabFollowing.addEventListener('click', () => {
    elements.tabFollowing.classList.add('active');
    elements.tabForYou.classList.remove('active');
    state.activeTab = 'following';
    fetchThreads();
  });

  // Topic filter
  elements.selectCategory.addEventListener('change', (e) => {
    state.activeCategory = e.target.value;
    fetchThreads();
  });

  // Compose actions
  elements.btnInlineSubmit.addEventListener('click', handleCreateThread);
  elements.inlineComposeInput.addEventListener('input', (e) => {
    const left = 280 - e.target.value.length;
    elements.charCounter.textContent = left;
    elements.charCounter.style.color = left < 0 ? 'var(--danger)' : 'var(--text-muted)';
    elements.btnInlineSubmit.disabled = left < 0 || e.target.value.trim().length === 0;
  });

  // Search input
  if (elements.widgetSearchInput) {
    elements.widgetSearchInput.addEventListener('input', handleSearch);
  }

  // Thread card actions (delegated)
  elements.threadsContainer.addEventListener('click', handleThreadAction);
  elements.suggestedUsersList.addEventListener('click', handleFollow);

  // Modal actions
  elements.btnOpenCompose.addEventListener('click', () => {
    elements.inlineComposeInput.focus();
  });

  elements.btnCloseModal.addEventListener('click', () => {
    elements.threadModal.style.display = 'none';
  });

  elements.btnCancelModal.addEventListener('click', () => {
    elements.threadModal.style.display = 'none';
  });

  elements.btnPublishQuote.addEventListener('click', handlePublishQuote);
}

// Global Notification Toast
function showNotification(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = \`notification-toast toast-\${type}\`;
  toast.textContent = msg;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = type === 'danger' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
  toast.style.color = '#fff';
  toast.style.padding = '10px 18px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '13px';
  toast.style.fontWeight = '600';
  toast.style.zIndex = '999999';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

window.addEventListener('error', (e) => {
  showNotification(\`Unhandled Error: \${e.message}\`, 'danger');
});

// Utility Helpers
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTimeAgo(dateStr) {
  const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diffSec < 60) return \`\${Math.max(1, diffSec)}s\`;
  if (diffSec < 3600) return \`\${Math.floor(diffSec / 60)}m\`;
  if (diffSec < 86400) return \`\${Math.floor(diffSec / 3600)}h\`;
  return \`\${Math.floor(diffSec / 86400)}d\`;
}

// Start client app
document.addEventListener('DOMContentLoaded', initApp);
`;
}

// Clean Base styles.css
function getCleanStylesCss() {
  const baseCss = fs.readFileSync(path.join(REPO_DIR, 'public', 'styles.css'), 'utf8');
  // Strip any previous RF-16, RF-18, RF-20 injection
  let clean = baseCss
    .replace(/\/\* --- BENCHMARK DEFECTS ---[\s\S]*$/, '')
    .trim();

  // Ensure clean mobile bottom nav style exists
  clean += `

/* Mobile Responsive Navigation (Clean Baseline) */
.bottom-nav {
  display: none;
}

@media (max-width: 900px) {
  .sidebar, .right-sidebar {
    display: none;
  }
  .app-container {
    grid-template-columns: 1fr;
    padding-bottom: 70px;
  }
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: var(--bg-card);
    border-top: 1px solid var(--border-color);
    justify-content: space-around;
    align-items: center;
    z-index: 100;
  }
  .bottom-nav-item {
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bottom-nav-item.active {
    color: var(--accent-blue);
  }
}
`;
  return clean;
}

// Clean Base server/index.js
function getCleanServerJs() {
  return `const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database
initDatabase();

// In-memory active session for default reviewer
const DEFAULT_USER_ID = 'usr_current';

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'MetaPulse',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get current authenticated user
 */
app.get('/api/me', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(DEFAULT_USER_ID);
  res.json(user);
});

/**
 * Get feed threads
 */
app.get('/api/threads', (req, res) => {
  const tab = req.query.tab || 'for_you';
  const category = req.query.category;

  let query = \`
    SELECT 
      t.*,
      u.username,
      u.display_name,
      u.avatar_url,
      u.verified,
      EXISTS(SELECT 1 FROM likes l WHERE l.thread_id = t.id AND l.user_id = ?) as is_liked,
      EXISTS(SELECT 1 FROM bookmarks b WHERE b.thread_id = t.id AND b.user_id = ?) as is_bookmarked
    FROM threads t
    JOIN users u ON t.user_id = u.id
  \`;
  const params = [DEFAULT_USER_ID, DEFAULT_USER_ID];

  if (category && category !== 'all') {
    query += ' WHERE t.category = ?';
    params.push(category);
  }

  query += ' ORDER BY t.created_at DESC LIMIT 50';

  const rows = db.prepare(query).all(...params);
  res.json({
    tab,
    count: rows.length,
    threads: rows
  });
});

/**
 * Get single thread with replies
 */
app.get('/api/threads/:id', (req, res) => {
  const thread = db.prepare(\`
    SELECT t.*, u.username, u.display_name, u.avatar_url, u.verified
    FROM threads t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  \`).get(req.params.id);

  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }

  const replies = db.prepare(\`
    SELECT r.*, u.username, u.display_name, u.avatar_url, u.verified
    FROM replies r
    JOIN users u ON r.user_id = u.id
    WHERE r.thread_id = ?
    ORDER BY r.created_at ASC
  \`).all(req.params.id);

  res.json({
    thread,
    replies
  });
});

/**
 * Create a new thread
 */
app.post('/api/threads', (req, res) => {
  const { content, media_url, media_type, category } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content cannot be empty' });
  }

  const threadId = 'thr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  const threadCategory = category || 'general';

  db.prepare(\`
    INSERT INTO threads (id, user_id, content, media_url, media_type, category)
    VALUES (?, ?, ?, ?, ?, ?)
  \`).run(threadId, DEFAULT_USER_ID, content, media_url || null, media_type || null, threadCategory);

  const created = db.prepare(\`
    SELECT t.*, u.username, u.display_name, u.avatar_url, u.verified
    FROM threads t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  \`).get(threadId);

  res.status(201).json(created);
});

/**
 * Toggle like on thread
 */
app.post('/api/threads/:id/like', (req, res) => {
  const threadId = req.params.id;
  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND thread_id = ?').get(DEFAULT_USER_ID, threadId);

  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    db.prepare('UPDATE threads SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(threadId);
    return res.json({ liked: false });
  } else {
    const likeId = 'lik_' + Date.now();
    db.prepare('INSERT INTO likes (id, user_id, thread_id) VALUES (?, ?, ?)').run(likeId, DEFAULT_USER_ID, threadId);
    db.prepare('UPDATE threads SET likes_count = likes_count + 1 WHERE id = ?').run(threadId);
    return res.json({ liked: true });
  }
});

/**
 * Toggle bookmark
 */
app.post('/api/threads/:id/bookmark', (req, res) => {
  const threadId = req.params.id;
  const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND thread_id = ?').get(DEFAULT_USER_ID, threadId);

  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
    return res.json({ bookmarked: false });
  } else {
    db.prepare('INSERT INTO bookmarks (id, user_id, thread_id) VALUES (?, ?, ?)').run('bm_' + Date.now(), DEFAULT_USER_ID, threadId);
    return res.json({ bookmarked: true });
  }
});

/**
 * Follow/unfollow a user
 */
app.post('/api/users/:id/follow', (req, res) => {
  const targetUserId = req.params.id;
  db.prepare('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?').run(targetUserId);
  const updated = db.prepare('SELECT followers_count FROM users WHERE id = ?').get(targetUserId);

  res.json({ following: true, followers_count: updated.followers_count });
});

/**
 * SPA client fallback
 */
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(\`🚀 MetaPulse server running on http://0.0.0.0:\${PORT}\`);
  });
}

module.exports = app;
`;
}

// Individual Bug Transformers
const BUGS = {
  'RF-01': {
    title: 'Null CurrentUser State Dereference on Quote Repost',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        'async function handlePublishQuote() {\n  const comment = elements.quoteCommentInput.value;',
        `async function handlePublishQuote() {\n  const comment = elements.quoteCommentInput.value;\n  let session;\n  console.log("Processing quote repost with profile:", session.currentUser.profileId);`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-02': {
    title: 'Stale Follower Count Multi-Increment',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `async function handleFollow(e) {\n  const btn = e.target.closest('.btn-follow');\n  if (!btn || btn.disabled) return;\n  btn.disabled = true;\n\n  const userId = btn.dataset.userId;\n  try {\n    const res = await fetch(\`/api/users/\${userId}/follow\`, { method: 'POST' });\n    const data = await res.json();\n\n    btn.textContent = 'Following';\n    btn.classList.add('following');\n  } catch (err) {\n    console.error('Follow failed:', err);\n    btn.disabled = false;\n  }\n}`,
        `async function handleFollow(e) {\n  const btn = e.target.closest('.btn-follow');\n  if (!btn) return;\n\n  const userId = btn.dataset.userId;\n  try {\n    const res = await fetch(\`/api/users/\${userId}/follow\`, { method: 'POST' });\n    const data = await res.json();\n\n    let count = parseInt(btn.getAttribute('data-count') || '142', 10) + 1;\n    btn.setAttribute('data-count', count);\n    btn.textContent = \`Following (\${count})\`;\n    showNotification(\`Followed creator! Total: \${count}\`, 'success');\n  } catch (err) {\n    console.error('Follow failed:', err);\n  }\n}`
      ),
      stylesCss,
      serverJs: serverJs.replace(
        "UPDATE users SET followers_count = followers_count + 1 WHERE id = ?",
        "UPDATE users SET followers_count = followers_count + 2 WHERE id = ?"
      )
    })
  },
  'RF-03': {
    title: 'Negative Character Counter Underflow and Bypass',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `  elements.inlineComposeInput.addEventListener('input', (e) => {\n    const left = 280 - e.target.value.length;\n    elements.charCounter.textContent = left;\n    elements.charCounter.style.color = left < 0 ? 'var(--danger)' : 'var(--text-muted)';\n    elements.btnInlineSubmit.disabled = left < 0 || e.target.value.trim().length === 0;\n  });`,
        `  elements.inlineComposeInput.addEventListener('input', (e) => {\n    const left = 10 - e.target.value.length;\n    elements.charCounter.textContent = left;\n    elements.charCounter.style.color = left < 0 ? 'var(--danger)' : 'var(--text-muted)';\n    elements.btnInlineSubmit.disabled = false;\n  });`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-04': {
    title: 'Draft State Loss on Feed Category Filter Switch',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `  elements.selectCategory.addEventListener('change', (e) => {\n    state.activeCategory = e.target.value;\n    fetchThreads();\n  });`,
        `  elements.selectCategory.addEventListener('change', (e) => {\n    state.activeCategory = e.target.value;\n    elements.inlineComposeInput.value = '';\n    elements.charCounter.textContent = '280';\n    showNotification('Category switched: draft state reset to empty!', 'info');\n    fetchThreads();\n  });`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-05': {
    title: 'Concurrent Like Race Condition De-sync',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `async function toggleLike(threadId, btn) {\n  const countEl = btn.querySelector('.like-count');\n  let currentCount = parseInt(countEl.textContent, 10);\n\n  try {\n    const res = await fetch(\`/api/threads/\${threadId}/like\`, { method: 'POST' });\n    const data = await res.json();\n\n    if (data.liked) {\n      btn.classList.add('liked');\n      countEl.textContent = currentCount + 1;\n    } else {\n      btn.classList.remove('liked');\n      countEl.textContent = Math.max(0, currentCount - 1);\n    }\n  } catch (err) {\n    console.error('Like toggle failed:', err);\n  }\n}`,
        `async function toggleLike(threadId, btn) {\n  const countEl = btn.querySelector('.like-count');\n  let currentCount = parseInt(countEl.textContent, 10);\n  btn.classList.add('liked');\n  countEl.textContent = Math.max(0, currentCount - 1);\n  showNotification('Like desync: UI liked but counter decremented!', 'warning');\n}`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-06': {
    title: 'Whitespace Only Thread Submission Bypass',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `async function handleCreateThread() {\n  const content = elements.inlineComposeInput.value;\n\n  if (!content || !content.trim()) return;`,
        `async function handleCreateThread() {\n  const content = elements.inlineComposeInput.value;\n  if (!content) return;`
      ),
      stylesCss,
      serverJs: serverJs.replace(
        `if (!content || !content.trim()) {\n    return res.status(400).json({ error: 'Content cannot be empty' });\n  }`,
        `if (!content) {\n    return res.status(400).json({ error: 'Content cannot be empty' });\n  }`
      )
    })
  },
  'RF-07': {
    title: 'Profile Bio Input Length HTML Tag Check Bypass',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `async function handleCreateThread() {\n  const content = elements.inlineComposeInput.value;`,
        `async function handleCreateThread() {\n  const content = elements.inlineComposeInput.value;\n  const htmlString = \`<span>\${content}</span>\`;\n  if (htmlString.length > 30) {\n    showNotification('Validation error: Raw HTML length exceeded 30 chars!', 'danger');\n    return;\n  }`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-08': {
    title: 'Disabled Post Button Permanently Stuck',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `async function handleCreateThread() {\n  const content = elements.inlineComposeInput.value;`,
        `async function handleCreateThread() {\n  const content = elements.inlineComposeInput.value;\n  if (!state.postButtonStuck) {\n    state.postButtonStuck = true;\n    elements.btnInlineSubmit.disabled = true;\n    showNotification('Validation warning: Post button permanently disabled!', 'danger');\n    return;\n  }`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-09': {
    title: 'Search Input Sanitization Regex Crash',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `function handleSearch(e) {\n  const query = e.target.value;`,
        `function handleSearch(e) {\n  const query = e.target.value;\n  if (query.includes('?') || query.includes('*') || query.includes('[')) {\n    const rx = new RegExp(query, 'i');\n  }`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-10': {
    title: 'Category Dropdown Selection Reset on Submit',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `async function handleCreateThread() {\n  const content = elements.inlineComposeInput.value;`,
        `async function handleCreateThread() {\n  const content = elements.inlineComposeInput.value;\n  elements.selectCategory.value = 'all';\n  showNotification('Submit warning: Category selection reset to General!', 'warning');`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-11': {
    title: 'Stale Async Closure Race on Rapid Tab Switch',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `    if (currentFetchId !== latestFetchId) {\n      return;\n    }`,
        `    if (state.activeTab === 'for_you') {\n      await new Promise(r => setTimeout(r, 1200));\n    }`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-12': {
    title: 'Missing Await on Bookmark Persistence',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `async function toggleBookmark(threadId, btn) {\n  try {\n    const res = await fetch(\`/api/threads/\${threadId}/bookmark\`, { method: 'POST' });\n    const data = await res.json();\n\n    if (data.bookmarked) {\n      btn.classList.add('bookmarked');\n    } else {\n      btn.classList.remove('bookmarked');\n    }\n  } catch (err) {\n    console.error('Bookmark toggle failed:', err);\n  }\n}`,
        `async function toggleBookmark(threadId, btn) {\n  try {\n    fetch(\`/api/threads/\${threadId}/bookmark\`, { method: 'POST' });\n    btn.classList.add('bookmarked');\n    showNotification('Bookmarked! (State will be lost on page reload)', 'info');\n  } catch (err) {\n    console.error('Bookmark toggle failed:', err);\n  }\n}`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-13': {
    title: 'Unhandled 500 Network Error Hangs Loading Spinner',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `    const res = await fetch(url);\n    if (!res.ok) {\n      throw new Error(\`Server returned HTTP \${res.status}\`);\n    }`,
        `    const res = await fetch(url);\n    if (!res.ok) {\n      return;\n    }`
      ).replace(
        `  } catch (err) {\n    elements.threadsContainer.innerHTML = \`\n      <div class="loading-state">\n        <p style="color: var(--danger);">Failed to load threads: \${err.message}</p>\n      </div>\n    \`;\n  } finally {\n    state.isLoading = false;\n    if (elements.feedLoader) elements.feedLoader.style.display = 'none';\n  }`,
        `  } catch (err) {\n    return;\n  }`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-14': {
    title: 'Typeahead Search Out-of-Order Response Overwrite Race',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `function handleSearch(e) {\n  const query = e.target.value;\n\n  // Client filter`,
        `let searchSeq = 0;\nfunction handleSearch(e) {\n  const query = e.target.value;\n  const thisSeq = ++searchSeq;\n  const delay = query.length < 3 ? 1000 : 100;\n  setTimeout(() => {\n    elements.threadsContainer.innerHTML = \`\n      <div class="loading-state">\n        <p>Search results for: "\${escapeHtml(query)}" (Stale sequence: \${thisSeq})</p>\n      </div>\n    \`;\n  }, delay);\n  return;\n\n  // Client filter`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-15': {
    title: 'Silent Session Expiry on Comment Submission',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `async function handlePublishQuote() {\n  const comment = elements.quoteCommentInput.value;`,
        `async function handlePublishQuote() {\n  const comment = elements.quoteCommentInput.value;\n  elements.threadModal.style.display = 'none';\n  elements.quoteCommentInput.value = '';\n  showNotification('Session expired silently: draft closed without warning.', 'danger');\n  return;`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-16': {
    title: 'Modal Backdrop Z-Index Click Interception',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs,
      stylesCss: stylesCss + `\n\n/* BUG RF-16: Modal Backdrop Click Interception */\n.modal-backdrop::after {\n  content: '';\n  position: absolute;\n  inset: 0;\n  z-index: 99999;\n  pointer-events: auto;\n}\n`,
      serverJs
    })
  },
  'RF-17': {
    title: 'Dynamic Selector Drift on Feed Re-render',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        "const likeBtnId = `btn-like-${thread.id}`;",
        "const likeBtnId = `btn-like-drift-${Math.floor(Math.random() * 90000 + 10000)}`;"
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-18': {
    title: 'Thread Card Overflow Hidden Clips Content',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs,
      stylesCss: stylesCss + `\n\n/* BUG RF-18: Thread Card Overflow Hidden */\n.thread-card {\n  overflow: hidden !important;\n  max-height: 120px !important;\n}\n`,
      serverJs
    })
  },
  'RF-19': {
    title: 'Focus Trap Escape to Background Page',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs: appJs.replace(
        `function openQuoteModal(thread) {`,
        `function openQuoteModal(thread) {\n  elements.quoteCommentInput.setAttribute('tabindex', '-1');\n  elements.btnPublishQuote.setAttribute('tabindex', '-1');`
      ),
      stylesCss,
      serverJs
    })
  },
  'RF-20': {
    title: 'Mobile Navigation Breakpoint Vanish Below 900px',
    transform: ({ appJs, stylesCss, serverJs }) => ({
      appJs,
      stylesCss: stylesCss.replace(
        `  .bottom-nav {\n    display: flex;\n`,
        `  .bottom-nav {\n    display: none !important;\n`
      ),
      serverJs
    })
  }
};

function run(cmd) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { cwd: REPO_DIR, encoding: 'utf8' });
}

async function main() {
  console.log('🚀 Starting MetaPulse Benchmark & Dataset Generator');
  console.log('Target: 20 single-bug branches + 1 all-bugs main branch (Zero synthetic if/else)');

  const cleanAppJs = getCleanAppJs();
  const cleanStylesCss = getCleanStylesCss();
  const cleanServerJs = getCleanServerJs();

  // Remove server/bugs.js if it exists
  const bugsJsPath = path.join(REPO_DIR, 'server', 'bugs.js');
  if (fs.existsSync(bugsJsPath)) {
    fs.unlinkSync(bugsJsPath);
    console.log('🗑️ Deleted server/bugs.js');
  }

  // Ensure index.html has bottom-nav
  const htmlPath = path.join(REPO_DIR, 'public', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  if (!html.includes('class="bottom-nav"')) {
    const bottomNavHtml = `
    <!-- Mobile Bottom Navigation -->
    <nav class="bottom-nav">
      <a href="#feed" class="bottom-nav-item active"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></a>
      <a href="#search" class="bottom-nav-item"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></a>
      <a href="#activity" class="bottom-nav-item"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></a>
      <a href="#profile" class="bottom-nav-item"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></a>
    </nav>
  </div>`;
    html = html.replace('</div>\n\n  <!-- Dedicated Thread Modal', `${bottomNavHtml}\n\n  <!-- Dedicated Thread Modal`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('✅ Updated index.html with bottom-nav markup');
  }

  // 1. Generate and push each of the 20 single-bug branches
  for (let i = 1; i <= 20; i++) {
    const bugId = 'RF-' + String(i).padStart(2, '0');
    const branchName = `bug/${bugId}`;
    const bugDef = BUGS[bugId];
    console.log(`\n==================================================`);
    console.log(`Creating branch: ${branchName} (${bugDef.title})`);

    // Switch to new branch
    run(`git checkout -B ${branchName}`);

    // Apply ONLY this bug
    const transformed = bugDef.transform({
      appJs: cleanAppJs,
      stylesCss: cleanStylesCss,
      serverJs: cleanServerJs
    });

    fs.writeFileSync(path.join(REPO_DIR, 'public', 'app.js'), transformed.appJs, 'utf8');
    fs.writeFileSync(path.join(REPO_DIR, 'public', 'styles.css'), transformed.stylesCss, 'utf8');
    fs.writeFileSync(path.join(REPO_DIR, 'server', 'index.js'), transformed.serverJs, 'utf8');

    // Add & commit
    run('git add -A');
    try {
      run(`git commit -m "Introduce isolated benchmark defect: [${bugId}] ${bugDef.title}"`);
    } catch (e) {
      console.log('Nothing to commit or already committed.');
    }

    // Push to GitHub
    run(`git push -u origin ${branchName} --force`);
    console.log(`✅ Pushed ${branchName} to origin!`);
  }

  // 2. Generate and push main branch with ALL 20 BUGS
  console.log(`\n==================================================`);
  console.log(`Creating main branch with ALL 20 bugs natively present`);
  run(`git checkout main`);

  let allAppJs = cleanAppJs;
  let allStylesCss = cleanStylesCss;
  let allServerJs = cleanServerJs;

  for (let i = 1; i <= 20; i++) {
    const bugId = 'RF-' + String(i).padStart(2, '0');
    const res = BUGS[bugId].transform({
      appJs: allAppJs,
      stylesCss: allStylesCss,
      serverJs: allServerJs
    });
    allAppJs = res.appJs;
    allStylesCss = res.stylesCss;
    allServerJs = res.serverJs;
  }

  fs.writeFileSync(path.join(REPO_DIR, 'public', 'app.js'), allAppJs, 'utf8');
  fs.writeFileSync(path.join(REPO_DIR, 'public', 'styles.css'), allStylesCss, 'utf8');
  fs.writeFileSync(path.join(REPO_DIR, 'server', 'index.js'), allServerJs, 'utf8');

  run('git add -A');
  try {
    run(`git commit -m "MetaPulse baseline with all 20 native benchmark defects (SWE-bench architecture)"`);
  } catch (e) {
    console.log('Nothing to commit or already committed on main.');
  }
  run('git push origin main --force');
  console.log('✅ Pushed main to origin with all 20 bugs natively present!');

  console.log('\n🎉 ALL 20 BRANCHES + MAIN SUCCESSFULLY GENERATED & PUSHED!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
