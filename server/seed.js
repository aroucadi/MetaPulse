const { db, initDatabase } = require('./db');

function seedData() {
  initDatabase();

  // Clear existing data to ensure deterministic state
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM bookmarks;
    DELETE FROM likes;
    DELETE FROM replies;
    DELETE FROM threads;
    DELETE FROM users;
  `);

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, display_name, avatar_url, bio, verified, followers_count, following_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    {
      id: 'usr_zuck',
      username: 'markzuck',
      display_name: 'Mark Zuckerberg',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Building open-source AI, Llama, smart glasses, and the future of social connection.',
      verified: 1,
      followers_count: 3200000,
      following_count: 142
    },
    {
      id: 'usr_ylecun',
      username: 'ylecun',
      display_name: 'Yann LeCun',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Chief AI Scientist at Meta, NYU Silver Professor. Autonomous Machine Intelligence & JEPA.',
      verified: 1,
      followers_count: 1150000,
      following_count: 388
    },
    {
      id: 'usr_alex',
      username: 'alex_frontend',
      display_name: 'Alex Rivera',
      avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      bio: 'Staff Engineer building high-scale real-time web applications. Open source fanatic.',
      verified: 0,
      followers_count: 14200,
      following_count: 612
    },
    {
      id: 'usr_sarah',
      username: 'sarah_ml',
      display_name: 'Sarah Chen',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      bio: 'Research scientist working on multimodal video understanding and grounding models.',
      verified: 1,
      followers_count: 48900,
      following_count: 421
    },
    {
      id: 'usr_current',
      username: 'demo_user',
      display_name: 'Demo Reviewer',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: 'Evaluating MetaPulse for Cerebral Valley & Meta AI Hackathon 2026.',
      verified: 1,
      followers_count: 1250,
      following_count: 85
    }
  ];

  for (const u of users) {
    insertUser.run(u.id, u.username, u.display_name, u.avatar_url, u.bio, u.verified, u.followers_count, u.following_count);
  }

  const insertThread = db.prepare(`
    INSERT INTO threads (id, user_id, content, media_url, media_type, category, likes_count, replies_count, reposts_count, views_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const threads = [
    {
      id: 'thr_1',
      user_id: 'usr_zuck',
      content: 'Excited to announce the new open multimodal weights release. Frontier models should be accessible to all developers everywhere. Building for your world starts with open science. 🚀',
      media_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      media_type: 'image',
      category: 'announcement',
      likes_count: 8420,
      replies_count: 312,
      reposts_count: 1240,
      views_count: 94000,
      offset: '-2 hours'
    },
    {
      id: 'thr_2',
      user_id: 'usr_ylecun',
      content: 'Auto-regressive LLMs are useful tools, but the real path to human-level AI requires world models and joint-embedding predictive architectures (JEPA). Video is the richest perceptual training ground we have.',
      media_url: null,
      media_type: null,
      category: 'research',
      likes_count: 5120,
      replies_count: 245,
      reposts_count: 890,
      views_count: 62000,
      offset: '-4 hours'
    },
    {
      id: 'thr_3',
      user_id: 'usr_sarah',
      content: 'Testing visual grounding with live DOM accessibility trees. The gap between pixel segmentation masks and actionable web locators is shrinking fast. Here is a preview of the interactive modal demo:',
      media_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
      media_type: 'image',
      category: 'engineering',
      likes_count: 1420,
      replies_count: 58,
      reposts_count: 180,
      views_count: 18500,
      offset: '-6 hours'
    },
    {
      id: 'thr_4',
      user_id: 'usr_alex',
      content: 'Why does state management in modern web apps still break so easily? One stale closure in an async callback or unhandled undefined property dereference and the entire view crashes silently.',
      media_url: null,
      media_type: null,
      category: 'frontend',
      likes_count: 642,
      replies_count: 41,
      reposts_count: 35,
      views_count: 9200,
      offset: '-8 hours'
    }
  ];

  for (const t of threads) {
    insertThread.run(t.id, t.user_id, t.content, t.media_url, t.media_type, t.category, t.likes_count, t.replies_count, t.reposts_count, t.views_count, t.offset);
  }

  const insertReply = db.prepare(`
    INSERT INTO replies (id, thread_id, user_id, content, likes_count, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const replies = [
    {
      id: 'rep_1',
      thread_id: 'thr_1',
      user_id: 'usr_sarah',
      content: 'The multimodal benchmarks are showing huge jumps in spatial reasoning on video tasks. Huge milestone!',
      likes_count: 142,
      offset: '-1 hour'
    },
    {
      id: 'rep_2',
      thread_id: 'thr_1',
      user_id: 'usr_alex',
      content: 'Open weights mean developers can build deterministic harnesses and verification oracles on their own machines.',
      likes_count: 88,
      offset: '-45 minutes'
    },
    {
      id: 'rep_3',
      thread_id: 'thr_2',
      user_id: 'usr_sarah',
      content: 'Completely agree on video. Screen recordings of software bugs capture causal user intent that text bug reports always omit.',
      likes_count: 96,
      offset: '-3 hours'
    }
  ];

  for (const r of replies) {
    insertReply.run(r.id, r.thread_id, r.user_id, r.content, r.likes_count, r.offset);
  }

  const insertLike = db.prepare(`
    INSERT INTO likes (id, user_id, thread_id)
    VALUES (?, ?, ?)
  `);

  insertLike.run('lik_1', 'usr_current', 'thr_1');
  insertLike.run('lik_2', 'usr_alex', 'thr_1');
  insertLike.run('lik_3', 'usr_sarah', 'thr_2');

  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, from_user_id, type, thread_id, read)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run('notif_1', 'usr_current', 'usr_sarah', 'reply', 'thr_1', 0);
  insertNotification.run('notif_2', 'usr_current', 'usr_zuck', 'like', 'thr_1', 1);

  console.log('✅ MetaPulse database seeded successfully with realistic data!');
}

if (require.main === module) {
  seedData();
}

module.exports = {
  seedData
};
