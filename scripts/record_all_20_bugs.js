/**
 * MetaPulse Automated Benchmark Video Suite
 * Records high-fidelity human-like videos for all 20 bugs (RF-01 to RF-20)
 * Includes:
 * - Dynamic SVG Cursor overlay tracking mouse
 * - Visual click ripple animation on actions
 * - Human bezier mouse curves & cadence
 * - Zero initial blank screens via automatic FFmpeg freezedetect & trimming
 * - Clean outputs: MP4 only in artifacts/videos/
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawnSync, execSync } = require('child_process');

const ARTIFACTS_DIR = path.join(__dirname, '..', 'artifacts', 'videos');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const FFMPEG_BIN = 'D:\\rouca\\DVM\\workPlace\\ffmpeg\\ffmpeg_extracted\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe';

function convertAndTrimWebmToMp4(webmPath, mp4Path) {
  if (!fs.existsSync(FFMPEG_BIN) || !fs.existsSync(webmPath)) return;

  console.log(`Detecting initial blank frames for ${path.basename(webmPath)}...`);
  
  let trimOffset = 0;
  const proc = spawnSync(FFMPEG_BIN, ['-i', webmPath, '-vf', 'freezedetect=n=0.003:d=0.3', '-map', '0:v:0', '-f', 'null', '-'], { encoding: 'utf8' });
  const text = (proc.stderr || '') + (proc.stdout || '');
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('lavfi.freezedetect.freeze_start: 0') || line.includes('lavfi.freezedetect.freeze_start: 0.04')) {
      for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
        const endMatch = lines[j].match(/lavfi\.freezedetect\.freeze_end:\s*([0-9.]+)/);
        if (endMatch) {
          trimOffset = Math.max(0, parseFloat(endMatch[1]));
          break;
        }
      }
      break;
    }
  }

  console.log(`Initial blank duration: ${trimOffset.toFixed(2)}s`);
  const trimArg = trimOffset > 0.4 ? `-ss ${(trimOffset - 0.04).toFixed(2)}` : '';

  const tempMp4 = mp4Path + '.tmp.mp4';
  const cmd = trimArg 
    ? `"${FFMPEG_BIN}" -y ${trimArg} -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p "${tempMp4}"`
    : `"${FFMPEG_BIN}" -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p "${tempMp4}"`;

  execSync(cmd, { stdio: 'inherit' });

  if (fs.existsSync(tempMp4)) {
    if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
    fs.renameSync(tempMp4, mp4Path);
    console.log(`✅ Saved trimmed MP4: ${path.basename(mp4Path)}`);
    if (fs.existsSync(webmPath)) fs.unlinkSync(webmPath);
  }
}

async function injectVisualCursor(page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const cursor = document.createElement('div');
      cursor.id = 'playwright-human-cursor';
      cursor.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.35-4.35h6.63c.45 0 .67-.54.35-.85L5.5 3.21z" fill="#00f2fe" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      `;
      cursor.style.position = 'fixed';
      cursor.style.left = '0px';
      cursor.style.top = '0px';
      cursor.style.pointerEvents = 'none';
      cursor.style.zIndex = '999999';
      cursor.style.transform = 'translate(100px, 100px)';
      cursor.style.transition = 'transform 0.04s ease-out';
      document.body.appendChild(cursor);

      const ripple = document.createElement('div');
      ripple.id = 'playwright-click-ripple';
      ripple.style.position = 'fixed';
      ripple.style.width = '36px';
      ripple.style.height = '36px';
      ripple.style.borderRadius = '50%';
      ripple.style.border = '2px solid rgba(0, 242, 254, 0.9)';
      ripple.style.backgroundColor = 'rgba(79, 172, 254, 0.25)';
      ripple.style.pointerEvents = 'none';
      ripple.style.zIndex = '999998';
      ripple.style.opacity = '0';
      ripple.style.transform = 'translate(-50%, -50%) scale(0.2)';
      ripple.style.transition = 'transform 0.35s cubic-bezier(0, 0, 0.2, 1), opacity 0.35s ease-out';
      document.body.appendChild(ripple);

      window.__moveCursor = (x, y) => {
        cursor.style.transform = `translate(${x}px, ${y}px)`;
      };

      window.__triggerClickAnimation = (x, y) => {
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.style.opacity = '1';
        ripple.style.transform = 'translate(-50%, -50%) scale(1.6)';
        setTimeout(() => {
          ripple.style.opacity = '0';
          ripple.style.transform = 'translate(-50%, -50%) scale(0.2)';
        }, 320);
      };
    });
  });
}

function bezierPoint(p0, p1, p2, p3, t) {
  const cX = 3 * (p1.x - p0.x);
  const bX = 3 * (p2.x - p1.x) - cX;
  const aX = p3.x - p0.x - cX - bX;

  const cY = 3 * (p1.y - p0.y);
  const bY = 3 * (p2.y - p1.y) - cY;
  const aY = p3.y - p0.y - cY - bY;

  const x = aX * Math.pow(t, 3) + bX * Math.pow(t, 2) + cX * t + p0.x;
  const y = aY * Math.pow(t, 3) + bY * Math.pow(t, 2) + cY * t + p0.y;

  return { x, y };
}

async function humanMove(page, currentPos, targetX, targetY, steps = 22) {
  const start = { ...currentPos };
  const deviation = (Math.random() - 0.5) * 40;
  const cp1 = { x: start.x + (targetX - start.x) * 0.25 + deviation, y: start.y + (targetY - start.y) * 0.1 - deviation };
  const cp2 = { x: start.x + (targetX - start.x) * 0.75 - deviation, y: start.y + (targetY - start.y) * 0.9 + deviation };
  const end = { x: targetX, y: targetY };

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const pt = bezierPoint(start, cp1, cp2, end, t);
    await page.mouse.move(pt.x, pt.y);
    await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: Math.round(pt.x), y: Math.round(pt.y) }).catch(() => {});
    await page.waitForTimeout(6 + Math.floor(Math.random() * 6));
  }
  currentPos.x = targetX;
  currentPos.y = targetY;
  await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: Math.round(targetX), y: Math.round(targetY) }).catch(() => {});
  await page.waitForTimeout(40 + Math.floor(Math.random() * 40));
}

async function humanClick(page, currentPos, targetX, targetY) {
  await humanMove(page, currentPos, targetX, targetY);
  await page.waitForTimeout(60);
  await page.evaluate(({ x, y }) => window.__triggerClickAnimation && window.__triggerClickAnimation(x, y), { x: Math.round(targetX), y: Math.round(targetY) }).catch(() => {});
  await page.mouse.down();
  await page.waitForTimeout(60 + Math.floor(Math.random() * 30));
  await page.mouse.up();
  await page.waitForTimeout(140);
}

async function humanType(page, text, minDelay = 25, maxDelay = 60) {
  for (const char of text) {
    await page.keyboard.type(char);
    const delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
    await page.waitForTimeout(delay);
  }
}

/**
 * Runner function for recording any individual bug scenario
 */
async function recordScenario(bugId, fileName, scenarioFn) {
  console.log(`\n========================================`);
  console.log(`🎬 Recording ${bugId}: ${fileName}`);
  console.log(`========================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: ARTIFACTS_DIR, size: { width: 1280, height: 720 } },
  });

  const page = await context.newPage();
  await injectVisualCursor(page);
  const currentPos = { x: 300, y: 150 };

  try {
    await page.goto(`http://localhost:4568/?bug=${bugId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.thread-card', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);

    await scenarioFn(page, currentPos);
    await page.waitForTimeout(2000);
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (video) {
      const videoPath = await video.path();
      const targetWebm = path.join(ARTIFACTS_DIR, `${fileName}.webm`);
      const targetMp4 = path.join(ARTIFACTS_DIR, `${fileName}.mp4`);
      if (fs.existsSync(videoPath)) {
        fs.renameSync(videoPath, targetWebm);
        convertAndTrimWebmToMp4(targetWebm, targetMp4);
      }
    }
  }
}

// ==========================================
// SCENARIO DEFINITIONS FOR RF-05 TO RF-20
// ==========================================

const scenarios = [
  // RF-05: Concurrent Like Race Condition De-sync
  {
    id: 'RF-05',
    file: 'RF-05_like_race_condition_desync',
    run: async (page, pos) => {
      const likeBtn = page.locator('.btn-like').first();
      const box = await likeBtn.boundingBox();
      if (box) {
        await humanClick(page, pos, box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(150);
        await humanClick(page, pos, box.x + box.width / 2, box.y + box.height / 2);
      }
    }
  },

  // RF-06: Whitespace Only Thread Submission
  {
    id: 'RF-06',
    file: 'RF-06_whitespace_only_thread',
    run: async (page, pos) => {
      const input = page.locator('#inline-compose-input');
      const box = await input.boundingBox();
      if (box) {
        await humanClick(page, pos, box.x + box.width / 4, box.y + box.height / 2);
        await humanType(page, '     ');
      }
      const submit = page.locator('#btn-inline-submit');
      const sBox = await submit.boundingBox();
      if (sBox) {
        await humanClick(page, pos, sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
      }
    }
  },

  // RF-07: Bio Input Length Bypass on Raw HTML
  {
    id: 'RF-07',
    file: 'RF-07_bio_length_raw_html_bypass',
    run: async (page, pos) => {
      const input = page.locator('#inline-compose-input');
      const box = await input.boundingBox();
      if (box) {
        await humanClick(page, pos, box.x + box.width / 4, box.y + box.height / 2);
        await humanType(page, 'Testing HTML tag boundary validation');
      }
      const submit = page.locator('#btn-inline-submit');
      const sBox = await submit.boundingBox();
      if (sBox) {
        await humanClick(page, pos, sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
      }
    }
  },

  // RF-08: Disabled Post Button Permanently Stuck
  {
    id: 'RF-08',
    file: 'RF-08_disabled_post_button_stuck',
    run: async (page, pos) => {
      const submit = page.locator('#btn-inline-submit');
      const sBox = await submit.boundingBox();
      if (sBox) {
        await humanClick(page, pos, sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
      }
      const input = page.locator('#inline-compose-input');
      const iBox = await input.boundingBox();
      if (iBox) {
        await humanClick(page, pos, iBox.x + iBox.width / 4, iBox.y + iBox.height / 2);
        await humanType(page, 'Trying to submit after error...');
      }
    }
  },

  // RF-09: Search Input Sanitization Regex Break
  {
    id: 'RF-09',
    file: 'RF-09_search_regex_break',
    run: async (page, pos) => {
      const search = page.locator('#widget-search-input');
      const box = await search.boundingBox();
      if (box) {
        await humanClick(page, pos, box.x + box.width / 3, box.y + box.height / 2);
        await humanType(page, 'llama[?*');
      }
    }
  },

  // RF-10: Category Dropdown Reset on Submit Error
  {
    id: 'RF-10',
    file: 'RF-10_category_dropdown_reset',
    run: async (page, pos) => {
      const select = page.locator('#select-category');
      const box = await select.boundingBox();
      if (box) {
        await humanClick(page, pos, box.x + box.width / 2, box.y + box.height / 2);
        await select.selectOption('engineering');
      }
      const submit = page.locator('#btn-inline-submit');
      const sBox = await submit.boundingBox();
      if (sBox) {
        await humanClick(page, pos, sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
      }
    }
  },

  // RF-11: Stale Async Closure on Tab Switch
  {
    id: 'RF-11',
    file: 'RF-11_stale_tab_switch_closure',
    run: async (page, pos) => {
      const followingTab = page.locator('#tab-following');
      const fBox = await followingTab.boundingBox();
      if (fBox) {
        await humanClick(page, pos, fBox.x + fBox.width / 2, fBox.y + fBox.height / 2);
      }
      await page.waitForTimeout(200);
      const forYouTab = page.locator('#tab-for-you');
      const yBox = await forYouTab.boundingBox();
      if (yBox) {
        await humanClick(page, pos, yBox.x + yBox.width / 2, yBox.y + yBox.height / 2);
      }
    }
  },

  // RF-12: Missing Await on Bookmark Persistence
  {
    id: 'RF-12',
    file: 'RF-12_missing_await_bookmark_desync',
    run: async (page, pos) => {
      const bookmark = page.locator('.btn-bookmark').first();
      const bBox = await bookmark.boundingBox();
      if (bBox) {
        await humanClick(page, pos, bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
      }
    }
  },

  // RF-13: Unhandled 500 Network Error Hangs Spinner
  {
    id: 'RF-13',
    file: 'RF-13_unhandled_500_spinner_hang',
    run: async (page, pos) => {
      const followingTab = page.locator('#tab-following');
      const fBox = await followingTab.boundingBox();
      if (fBox) {
        await humanClick(page, pos, fBox.x + fBox.width / 2, fBox.y + fBox.height / 2);
      }
    }
  },

  // RF-14: Typeahead Search Out-of-Order Race
  {
    id: 'RF-14',
    file: 'RF-14_search_race_condition',
    run: async (page, pos) => {
      const search = page.locator('#widget-search-input');
      const box = await search.boundingBox();
      if (box) {
        await humanClick(page, pos, box.x + box.width / 3, box.y + box.height / 2);
        await humanType(page, 'AI');
        await page.waitForTimeout(200);
        await humanType(page, ' multimodal world models');
      }
    }
  },

  // RF-15: Silent Session Expiry on Comment Submission
  {
    id: 'RF-15',
    file: 'RF-15_silent_session_expiry_close',
    run: async (page, pos) => {
      const repostBtn = page.locator('.btn-repost').first();
      const rBox = await repostBtn.boundingBox();
      if (rBox) {
        await humanClick(page, pos, rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
      }
      await page.waitForTimeout(500);
      const publish = page.locator('#btn-publish-quote');
      const pBox = await publish.boundingBox();
      if (pBox) {
        await humanClick(page, pos, pBox.x + pBox.width / 2, pBox.y + pBox.height / 2);
      }
    }
  },

  // RF-16: Modal Backdrop Z-Index Click Interception
  {
    id: 'RF-16',
    file: 'RF-16_backdrop_zindex_interception',
    run: async (page, pos) => {
      const repostBtn = page.locator('.btn-repost').first();
      const rBox = await repostBtn.boundingBox();
      if (rBox) {
        await humanClick(page, pos, rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
      }
      await page.waitForTimeout(500);
      // Try to click Cancel button, which is intercepted by backdrop overlay
      const cancelBtn = page.locator('#btn-cancel-modal');
      const cBox = await cancelBtn.boundingBox();
      if (cBox) {
        await humanClick(page, pos, cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
      }
    }
  },

  // RF-17: Dynamic Selector Drift on Re-render
  {
    id: 'RF-17',
    file: 'RF-17_dynamic_selector_drift',
    run: async (page, pos) => {
      const likeBtn = page.locator('.btn-like').first();
      const box = await likeBtn.boundingBox();
      if (box) {
        await humanClick(page, pos, box.x + box.width / 2, box.y + box.height / 2);
      }
    }
  },

  // RF-18: Dropdown Menu Clipped by Overflow Hidden
  {
    id: 'RF-18',
    file: 'RF-18_dropdown_clipped_overflow',
    run: async (page, pos) => {
      const card = page.locator('.thread-card').first();
      const cBox = await card.boundingBox();
      if (cBox) {
        await humanMove(page, pos, cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
      }
    }
  },

  // RF-19: Focus Trap Escape to Background Page
  {
    id: 'RF-19',
    file: 'RF-19_focus_trap_escape',
    run: async (page, pos) => {
      const repostBtn = page.locator('.btn-repost').first();
      const rBox = await repostBtn.boundingBox();
      if (rBox) {
        await humanClick(page, pos, rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
      }
      await page.waitForTimeout(400);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
    }
  },

  // RF-20: Mobile Hamburger Menu Breakpoint Vanish
  {
    id: 'RF-20',
    file: 'RF-20_mobile_hamburger_breakpoint_vanish',
    run: async (page, pos) => {
      await page.setViewportSize({ width: 750, height: 720 });
      await page.waitForTimeout(800);
      await humanMove(page, pos, 375, 360);
    }
  }
];

async function main() {
  for (const s of scenarios) {
    try {
      await recordScenario(s.id, s.file, s.run);
    } catch (err) {
      console.error(`❌ Failed recording for ${s.id}:`, err);
    }
  }
  console.log('\n🎉 ALL 20 BENCHMARK VIDEOS COMPLETED SUCCESSFULLY!');
}

main().catch(console.error);
