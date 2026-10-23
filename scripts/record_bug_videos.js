/**
 * Realistic human-like interaction recording script for MetaPulse bugs
 * Features:
 * - Visible SVG mouse cursor overlay tracking exact coordinates
 * - Visual click ripple / pulse animation on mousedown
 * - Smoothed cubic bezier mouse acceleration curves
 * - Micro-hesitations and natural typing cadence
 * - Automatic conversion from .webm to high-quality .mp4 via local FFmpeg
 * - AUTOMATIC BLANK-FRAME STRIPPING: Removes initial browser navigation white screen
 *   so the video immediately starts with the rendered UI loaded!
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

/**
 * Uses FFmpeg freezedetect to measure the exact initial blank screen freeze duration
 * in seconds, then converts and trims cleanly so the output starts directly on UI content.
 */
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
          const rawEnd = parseFloat(endMatch[1]);
          // If the freeze ends at X, the UI is rendered right at or after X
          trimOffset = Math.max(0, rawEnd);
          break;
        }
      }
      break;
    }
  }

  console.log(`Initial blank duration: ${trimOffset.toFixed(2)}s`);
  const trimArg = trimOffset > 0.5 ? `-ss ${(trimOffset - 0.05).toFixed(2)}` : '';

  const tempMp4 = mp4Path + '.tmp.mp4';
  const cmd = trimArg 
    ? `"${FFMPEG_BIN}" -y ${trimArg} -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p "${tempMp4}"`
    : `"${FFMPEG_BIN}" -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p "${tempMp4}"`;

  console.log(`Executing conversion & trimming: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });

  if (fs.existsSync(tempMp4)) {
    if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
    fs.renameSync(tempMp4, mp4Path);
    console.log(`Successfully generated cleanly trimmed MP4: ${mp4Path}`);
  }
}

// Injects visual cursor & click indicator into the browser DOM
async function injectVisualCursor(page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      // 1. Cursor element
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

      // 2. Click ripple element
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

async function humanMove(page, currentPos, targetX, targetY, steps = 28) {
  const start = { ...currentPos };
  const deviation = (Math.random() - 0.5) * 50;
  const cp1 = { x: start.x + (targetX - start.x) * 0.25 + deviation, y: start.y + (targetY - start.y) * 0.1 - deviation };
  const cp2 = { x: start.x + (targetX - start.x) * 0.75 - deviation, y: start.y + (targetY - start.y) * 0.9 + deviation };
  const end = { x: targetX, y: targetY };

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const pt = bezierPoint(start, cp1, cp2, end, t);
    await page.mouse.move(pt.x, pt.y);
    await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: Math.round(pt.x), y: Math.round(pt.y) }).catch(() => {});
    await page.waitForTimeout(8 + Math.floor(Math.random() * 8));
  }
  currentPos.x = targetX;
  currentPos.y = targetY;
  await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: Math.round(targetX), y: Math.round(targetY) }).catch(() => {});
  await page.waitForTimeout(80 + Math.floor(Math.random() * 80));
}

async function humanClick(page, currentPos, targetX, targetY) {
  await humanMove(page, currentPos, targetX, targetY);
  await page.waitForTimeout(100);
  await page.evaluate(({ x, y }) => window.__triggerClickAnimation && window.__triggerClickAnimation(x, y), { x: Math.round(targetX), y: Math.round(targetY) }).catch(() => {});
  await page.mouse.down();
  await page.waitForTimeout(75 + Math.floor(Math.random() * 40));
  await page.mouse.up();
  await page.waitForTimeout(200);
}

async function humanType(page, text, minDelay = 40, maxDelay = 95) {
  for (const char of text) {
    await page.keyboard.type(char);
    const delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
    await page.waitForTimeout(delay);
  }
}

async function recordRF01() {
  console.log('--- Recording Bug RF-01 with Visible Human Cursor & Clean Trim ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: ARTIFACTS_DIR,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();
  await injectVisualCursor(page);

  const currentPos = { x: 300, y: 150 };

  try {
    await page.goto('http://localhost:4568/?bug=RF-01', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.thread-card');
    await page.waitForTimeout(600);

    // Initial mouse presence
    await humanMove(page, currentPos, 640, 360, 20);
    await page.waitForTimeout(600);

    // Scroll through feed naturally
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(800);

    // Find and click the repost button on the first thread
    const repostBtn = page.locator('.btn-repost').first();
    await repostBtn.waitFor({ state: 'visible' });
    const rBox = await repostBtn.boundingBox();
    if (rBox) {
      await humanClick(page, currentPos, rBox.x + rBox.width / 2, rBox.y + rBox.height / 2);
    }
    await page.waitForTimeout(800);

    // Click into the quote comment textarea
    const textarea = page.locator('#quote-comment-input');
    await textarea.waitFor({ state: 'visible' });
    const tbBox = await textarea.boundingBox();
    if (tbBox) {
      await humanClick(page, currentPos, tbBox.x + tbBox.width / 4, tbBox.y + tbBox.height / 2);
    }
    await page.waitForTimeout(400);

    // Type realistic comment
    await humanType(page, 'This multimodal visual grounding architecture is a breakthrough! Great work team.');
    await page.waitForTimeout(700);

    // Click the Publish Quote button (Triggers RF-01 Bug Crash)
    const publishBtn = page.locator('#btn-publish-quote');
    const pBox = await publishBtn.boundingBox();
    if (pBox) {
      await humanClick(page, currentPos, pBox.x + pBox.width / 2, pBox.y + pBox.height / 2);
    }

    // Pause to highlight red crash notification banner
    await page.waitForTimeout(3200);

  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (video) {
      const videoPath = await video.path();
      const targetWebm = path.join(ARTIFACTS_DIR, 'RF-01_quote_repost_crash_with_cursor.webm');
      const targetMp4 = path.join(ARTIFACTS_DIR, 'RF-01_quote_repost_crash_with_cursor.mp4');
      if (fs.existsSync(videoPath)) {
        fs.renameSync(videoPath, targetWebm);
        console.log(`Raw video saved to: ${targetWebm}`);
        convertAndTrimWebmToMp4(targetWebm, targetMp4);
      }
    }
  }
}

async function main() {
  await recordRF01();
}

main().catch(console.error);
