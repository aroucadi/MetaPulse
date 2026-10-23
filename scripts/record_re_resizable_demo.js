/**
 * Record Real-World Open-Source Benchmark Demo:
 * Repository: bokuweb/re-resizable (Issue #152)
 * Trigger: Right-click (button === 2) on the resizer handle.
 * Expected bug symptom: Resizing initiates on right click, trapping the element in resize mode.
 * Features:
 * - Visible SVG cursor
 * - Visual click ripples (cyan for normal, amber/rose for right click)
 * - Human-like spline trajectory & pause timing
 * - Auto blank-screen trimming (FFmpeg freezedetect)
 * - Clean MP4 artifact output
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
    console.log(` Saved trimmed MP4: ${path.basename(mp4Path)}`);
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

      window.__triggerClickAnimation = (x, y, isRight = false) => {
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.style.borderColor = isRight ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 242, 254, 0.9)';
        ripple.style.backgroundColor = isRight ? 'rgba(239, 68, 68, 0.3)' : 'rgba(79, 172, 254, 0.25)';
        ripple.style.opacity = '1';
        ripple.style.transform = 'translate(-50%, -50%) scale(1.7)';
        setTimeout(() => {
          ripple.style.opacity = '0';
          ripple.style.transform = 'translate(-50%, -50%) scale(0.2)';
        }, 340);
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

async function humanMove(page, currentPos, targetX, targetY, steps = 24) {
  const start = { ...currentPos };
  const deviation = (Math.random() - 0.5) * 30;
  const cp1 = { x: start.x + (targetX - start.x) * 0.25 + deviation, y: start.y + (targetY - start.y) * 0.1 - deviation };
  const cp2 = { x: start.x + (targetX - start.x) * 0.75 - deviation, y: start.y + (targetY - start.y) * 0.9 + deviation };
  const end = { x: targetX, y: targetY };

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const pt = bezierPoint(start, cp1, cp2, end, t);
    await page.mouse.move(pt.x, pt.y);
    await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: Math.round(pt.x), y: Math.round(pt.y) }).catch(() => {});
    await page.waitForTimeout(7 + Math.floor(Math.random() * 6));
  }
  currentPos.x = targetX;
  currentPos.y = targetY;
  await page.evaluate(({ x, y }) => window.__moveCursor && window.__moveCursor(x, y), { x: Math.round(targetX), y: Math.round(targetY) }).catch(() => {});
  await page.waitForTimeout(40 + Math.floor(Math.random() * 40));
}

async function humanRightClick(page, currentPos, targetX, targetY) {
  await humanMove(page, currentPos, targetX, targetY);
  await page.waitForTimeout(90);
  await page.evaluate(({ x, y }) => window.__triggerClickAnimation && window.__triggerClickAnimation(x, y, true), { x: Math.round(targetX), y: Math.round(targetY) }).catch(() => {});
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(80);
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(140);
}

async function recordReResizableDemo() {
  console.log(`\n======================================================`);
  console.log(`🎬 Recording Open-Source Benchmark: re-resizable #152`);
  console.log(`======================================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: ARTIFACTS_DIR, size: { width: 1280, height: 720 } },
  });

  const page = await context.newPage();
  await injectVisualCursor(page);
  const currentPos = { x: 260, y: 160 };

  try {
    await page.goto('http://127.0.0.1:5175/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#hud-dimensions', { timeout: 10000 });
    await page.waitForTimeout(800);

    // Initial overview movement
    await humanMove(page, currentPos, 340, 240, 20);
    await page.waitForTimeout(500);

    // 1. Target the right edge handle of the resizable box
    // In re-resizable, right handle is located at the right edge
    const handleEl = page.locator('div[style*="cursor: ew-resize"]').first();
    const handleBox = await handleEl.boundingBox();

    let targetX = 400;
    let targetY = 280;

    if (handleBox) {
      targetX = handleBox.x + handleBox.width / 2;
      targetY = handleBox.y + handleBox.height / 2;
    } else {
      console.log('Using calculated coordinates for right handle');
      const box = await page.locator('#target-resize-handle').boundingBox();
      if (box) {
        targetX = box.x + box.width + 10;
        targetY = box.y;
      }
    }

    console.log(`Navigating to handle at (${Math.round(targetX)}, ${Math.round(targetY)})...`);
    await humanMove(page, currentPos, targetX, targetY, 28);
    await page.waitForTimeout(300);

    // 2. Perform Right Click (button: 'right' / which: 3)
    console.log(`Executing Right-Click to trigger Issue #152...`);
    await humanRightClick(page, currentPos, targetX, targetY);
    await page.waitForTimeout(400);

    // 3. Move mouse to the right — Bug manifestation: element tracks mouse and expands!
    console.log(`Demonstrating unintended resize expansion...`);
    await humanMove(page, currentPos, targetX + 130, targetY + 20, 32);
    await page.waitForTimeout(500);

    // 4. Move mouse left slightly
    await humanMove(page, currentPos, targetX + 70, targetY - 15, 24);
    await page.waitForTimeout(600);

    // 5. Expand outward again
    await humanMove(page, currentPos, targetX + 160, targetY + 10, 28);
    await page.waitForTimeout(800);

    // 6. Move over to inspect the DOM event log showing the bug
    await humanMove(page, currentPos, 880, 380, 26);
    await page.waitForTimeout(2000);

  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (video) {
      const videoPath = await video.path();
      const targetWebm = path.join(ARTIFACTS_DIR, 'DEMO_re-resizable_issue-152.webm');
      const targetMp4 = path.join(ARTIFACTS_DIR, 'DEMO_re-resizable_issue-152.mp4');
      if (fs.existsSync(videoPath)) {
        fs.renameSync(videoPath, targetWebm);
        convertAndTrimWebmToMp4(targetWebm, targetMp4);
      }
    }
  }
}

recordReResizableDemo().catch(console.error);
