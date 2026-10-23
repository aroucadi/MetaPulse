const express = require('express');
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

  let query = `
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
  `;
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
  const thread = db.prepare(`
    SELECT t.*, u.username, u.display_name, u.avatar_url, u.verified
    FROM threads t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }

  const replies = db.prepare(`
    SELECT r.*, u.username, u.display_name, u.avatar_url, u.verified
    FROM replies r
    JOIN users u ON r.user_id = u.id
    WHERE r.thread_id = ?
    ORDER BY r.created_at ASC
  `).all(req.params.id);

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

  if (!content) {
    return res.status(400).json({ error: 'Content cannot be empty' });
  }

  const threadId = 'thr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  const threadCategory = category || 'general';

  db.prepare(`
    INSERT INTO threads (id, user_id, content, media_url, media_type, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(threadId, DEFAULT_USER_ID, content, media_url || null, media_type || null, threadCategory);

  const created = db.prepare(`
    SELECT t.*, u.username, u.display_name, u.avatar_url, u.verified
    FROM threads t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `).get(threadId);

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
  db.prepare('UPDATE users SET followers_count = followers_count + 2 WHERE id = ?').run(targetUserId);
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
    console.log(`🚀 MetaPulse server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
