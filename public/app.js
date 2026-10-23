/**
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
    if (elements.userHandle) elements.userHandle.textContent = `@${state.currentUser.username}`;
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
    const url = `/api/threads?tab=${state.activeTab}&category=${state.activeCategory}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();

    if (currentFetchId !== latestFetchId) {
      return;
    }

    state.threads = data.threads || [];
    renderThreads();
  } catch (err) {
    elements.threadsContainer.innerHTML = `
      <div class="loading-state">
        <p style="color: var(--danger);">Failed to load threads: ${err.message}</p>
      </div>
    `;
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
    elements.threadsContainer.innerHTML = `
      <div class="loading-state">
        <p>No pulses found in this topic yet.</p>
      </div>
    `;
    return;
  }

  elements.threadsContainer.innerHTML = state.threads.map((thread) => {
    const likeBtnId = `btn-like-${thread.id}`;

    return `
      <article class="thread-card" data-thread-id="${thread.id}">
        <img src="${thread.avatar_url}" alt="${thread.display_name}" class="avatar-sm">
        <div style="flex: 1;">
          <header class="thread-header">
            <span class="display-name">${escapeHtml(thread.display_name)}</span>
            ${thread.verified ? '<span class="verified-icon" title="Verified Creator"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>' : ''}
            <span class="handle">@${escapeHtml(thread.username)}</span>
            <span class="timestamp">· ${formatTimeAgo(thread.created_at)}</span>
          </header>
          
          <div class="thread-content">${escapeHtml(thread.content)}</div>
          
          ${thread.media_url ? `
            <div class="thread-media">
              <img src="${thread.media_url}" alt="Post attachment" loading="lazy">
            </div>
          ` : ''}

          <footer class="thread-footer">
            <button id="${likeBtnId}" class="action-btn btn-like ${thread.is_liked ? 'liked' : ''}" data-action="like" data-id="${thread.id}" aria-label="Like post">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span class="like-count">${thread.likes_count}</span>
            </button>

            <button class="action-btn btn-reply" data-action="reply" data-id="${thread.id}" aria-label="Reply">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span>${thread.replies_count}</span>
            </button>

            <button class="action-btn btn-repost" data-action="quote" data-id="${thread.id}" aria-label="Quote thread">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              <span>${thread.reposts_count}</span>
            </button>

            <button class="action-btn btn-bookmark ${thread.is_bookmarked ? 'bookmarked' : ''}" data-action="bookmark" data-id="${thread.id}" aria-label="Bookmark">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </footer>
        </div>
      </article>
    `;
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
    const res = await fetch(`/api/threads/${threadId}/like`, { method: 'POST' });
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
    const res = await fetch(`/api/threads/${threadId}/bookmark`, { method: 'POST' });
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

  elements.quotedThreadPreview.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
      <img src="${thread.avatar_url}" alt="${thread.display_name}" class="avatar-sm" style="width: 24px; height: 24px;">
      <span style="font-weight: 700; font-size: 13px;">${escapeHtml(thread.display_name)}</span>
      <span style="color: var(--text-muted); font-size: 12px;">@${escapeHtml(thread.username)}</span>
    </div>
    <div style="font-size: 13px; color: var(--text-secondary);">${escapeHtml(thread.content)}</div>
  `;

  elements.quoteCommentInput.value = '';
  elements.threadModal.style.display = 'flex';
}

/**
 * Publish Quote Repost
 */
async function handlePublishQuote() {
  const comment = elements.quoteCommentInput.value;

  try {
    const fullContent = `${comment}\n\n[Quoted @${state.quotedThread.username}]: "${state.quotedThread.content}"`;
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
  const htmlString = `<span>${content}</span>`;
  if (htmlString.length > 30) {
    showNotification('Validation error: Raw HTML length exceeded 30 chars!', 'danger');
    return;
  }

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

  elements.suggestedUsersList.innerHTML = creators.map(c => `
    <div class="suggested-user-row">
      <div class="suggested-user-info">
        <img src="${c.avatar}" alt="${c.name}" class="avatar-sm">
        <div class="user-meta">
          <span class="name">${c.name}</span>
          <span class="handle">@${c.handle}</span>
        </div>
      </div>
      <button class="btn-follow" data-user-id="${c.id}" aria-label="Follow ${c.name}">Follow</button>
    </div>
  `).join('');
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
    const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
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
  elements.threadsContainer.innerHTML = filtered.length ? filtered.map(t => `
    <article class="thread-card">
      <div style="font-size: 14px; color: var(--text-primary);">${escapeHtml(t.content)}</div>
    </article>
  `).join('') : '<div class="loading-state"><p>No matching pulses.</p></div>';
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
  toast.className = `notification-toast toast-${type}`;
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
  showNotification(`Unhandled Error: ${e.message}`, 'danger');
});

// Utility Helpers
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTimeAgo(dateStr) {
  const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

// Start client app
document.addEventListener('DOMContentLoaded', initApp);
