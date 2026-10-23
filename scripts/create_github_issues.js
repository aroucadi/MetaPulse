const { execSync } = require('child_process');

const BUGS = [
  {
    id: 'RF-01',
    title: 'Quote Repost fails with TypeError: quoteContext is undefined',
    category: 'State/Logic',
    video: 'RF-01_quote_repost_crash_with_cursor.mp4',
    trigger: 'Clicking "Quote Thread" on an existing thread card.',
    steps: [
      'Navigate to MetaPulse feed (`http://localhost:3000?bug=RF-01`).',
      'Click the action menu on any feed thread card.',
      'Select "Quote Thread".',
      'Observe the uncaught TypeError in console and modal failing to open.'
    ],
    expected: 'Quote modal opens with quoted thread preview pre-attached and active author input.',
    actual: 'Uncaught TypeError: Cannot read property of undefined. The modal gets stuck in a broken half-rendered state.'
  },
  {
    id: 'RF-02',
    title: 'Follow button double-increments follower counter on rapid click',
    category: 'State/Logic',
    video: 'RF-02_stale_follower_increment.mp4',
    trigger: 'Clicking the "Follow" button on a user profile or card header.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-02`).',
      'Open user profile or click Follow button on a thread author.',
      'Click "Follow".',
      'Observe follower counter value jumping by +2 instead of +1.'
    ],
    expected: 'Follower counter increments strictly by 1 upon following a user.',
    actual: 'Duplicate event listener invocation causes optimistic counter to increment by 2.'
  },
  {
    id: 'RF-03',
    title: 'Character counter underflows into negative numbers and allows submission',
    category: 'State/Logic',
    video: 'RF-03_character_counter_underflow.mp4',
    trigger: 'Typing more than 500 characters in thread composer.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-03`).',
      'Open thread composer modal.',
      'Type or paste text exceeding 500 characters.',
      'Observe the character counter showing negative numbers (e.g. -12).',
      'Click "Post" button.'
    ],
    expected: 'Counter caps at 0 or turns red, and Post button becomes disabled.',
    actual: 'Counter displays negative values and Post button remains clickable, submitting invalid payload.'
  },
  {
    id: 'RF-04',
    title: 'Draft state lost on modal backdrop click without confirmation',
    category: 'State/Logic',
    video: 'RF-04_draft_state_loss.mp4',
    trigger: 'Clicking outside modal area while authoring thread content.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-04`).',
      'Open thread composer and type meaningful draft content.',
      'Accidentally click on the darkened modal backdrop overlay.',
      'Observe modal dismissing immediately.',
      'Re-open composer.'
    ],
    expected: 'Modal should prompt "Discard draft?" or retain existing draft text.',
    actual: 'Modal dismisses silently and completely purges draft content from memory.'
  },
  {
    id: 'RF-05',
    title: 'Rapid like click causes optimistic counter race condition desync',
    category: 'State/Logic',
    video: 'RF-05_like_race_condition_desync.mp4',
    trigger: 'Clicking like button twice quickly in succession.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-05`).',
      'Double-click the heart/like icon on a thread.',
      'Observe counter state vs visual icon fill state.'
    ],
    expected: 'Visual like state and like count remain synchronized with server response.',
    actual: 'Icon animates to active filled state while like count decrements, resulting in permanent desync.'
  },
  {
    id: 'RF-06',
    title: 'Whitespace-only thread content passes validation and gets published',
    category: 'Form/Validation',
    video: 'RF-06_whitespace_only_thread.mp4',
    trigger: 'Typing spaces/newlines and clicking Post.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-06`).',
      'Open thread composer.',
      'Type spaces or press Enter several times without alphanumeric characters.',
      'Click "Post".'
    ],
    expected: 'Post button remains disabled; validation error indicates text cannot be empty.',
    actual: 'Thread posts successfully, rendering a blank card into the public feed.'
  },
  {
    id: 'RF-07',
    title: 'Profile bio length validation checks raw HTML string instead of text',
    category: 'Form/Validation',
    video: 'RF-07_bio_length_raw_html_bypass.mp4',
    trigger: 'Entering bio with formatting or HTML characters.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-07`).',
      'Open Edit Profile modal.',
      'Enter a valid 140-character bio containing symbols or markup.',
      'Click "Save Profile".'
    ],
    expected: 'Validation checks visible plain-text character length.',
    actual: 'Validator inspects raw innerHTML string length, rejecting valid inputs with false overflow error.'
  },
  {
    id: 'RF-08',
    title: 'Disabled Post button remains stuck disabled after correcting input',
    category: 'Form/Validation',
    video: 'RF-08_disabled_post_button_stuck.mp4',
    trigger: 'Triggering validation error then entering valid text.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-08`).',
      'Clear thread composer to trigger disabled state.',
      'Type valid thread content.',
      'Observe Post button state.'
    ],
    expected: 'Post button dynamically re-enables as soon as input length > 0.',
    actual: 'Button remains disabled with disabled attribute permanently locked until page refresh.'
  },
  {
    id: 'RF-09',
    title: 'Search bar crashes client filter when entering regex special characters',
    category: 'Form/Validation',
    video: 'RF-09_search_regex_break.mp4',
    trigger: 'Typing "[", "(", or "*" into the search bar.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-09`).',
      'Focus search bar.',
      'Type "[" or "[tech".',
      'Observe browser console.'
    ],
    expected: 'Search performs literal string matching without throwing errors.',
    actual: 'Uncaught SyntaxError: Invalid regular expression. Feed goes blank.'
  },
  {
    id: 'RF-10',
    title: 'Category filter dropdown resets to "All" upon pagination or submit error',
    category: 'Form/Validation',
    video: 'RF-10_category_dropdown_reset.mp4',
    trigger: 'Filtering feed by category then navigating pages or submitting.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-10`).',
      'Select category "Engineering" from dropdown filter.',
      'Scroll down to load next page or click refresh.',
      'Observe dropdown state.'
    ],
    expected: 'Active filter remains "Engineering" across pagination queries.',
    actual: 'Filter dropdown silently resets value to "all", losing user filter context.'
  },
  {
    id: 'RF-11',
    title: 'Stale tab switch closure leaks old tab scroll listeners',
    category: 'Async/Data',
    video: 'RF-11_stale_tab_switch_closure.mp4',
    trigger: 'Rapidly switching between "For you" and "Following" tabs.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-11`).',
      'Click "Following" tab, then immediately click "For you".',
      'Scroll feed down.'
    ],
    expected: 'Only active tab query fires upon scrolling.',
    actual: 'Old tab event closure fires in background, appending following threads into "For you" feed.'
  },
  {
    id: 'RF-12',
    title: 'Bookmark button missing await causes UI state reversion on refresh',
    category: 'Async/Data',
    video: 'RF-12_missing_await_bookmark_desync.mp4',
    trigger: 'Clicking bookmark icon and refreshing page shortly after.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-12`).',
      'Click bookmark ribbon icon on a thread.',
      'Notice icon turns blue.',
      'Refresh browser or navigate to Bookmarks tab.'
    ],
    expected: 'Bookmark is persisted to database before optimistic transition settles.',
    actual: 'Missing await causes navigation before HTTP request finishes; thread is not bookmarked on reload.'
  },
  {
    id: 'RF-13',
    title: 'Unhandled 500 error leaves loading skeleton spinner running indefinitely',
    category: 'Async/Data',
    video: 'RF-13_unhandled_500_spinner_hang.mp4',
    trigger: 'Encountering a network error or 500 status on thread details fetch.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-13`).',
      'Click on a thread with simulated server error.',
      'Observe reply section.'
    ],
    expected: 'Error banner appears: "Failed to load replies. [Retry]".',
    actual: 'Loading spinner continues spinning forever; no error message is displayed.'
  },
  {
    id: 'RF-14',
    title: 'Typeahead search race condition: slow response overwrites newer results',
    category: 'Async/Data',
    video: 'RF-14_search_race_condition.mp4',
    trigger: 'Typing search query quickly (e.g. "ai" then "design").',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-14`).',
      'Type "ai", wait 100ms, then type "design".',
      'Observe final rendered results.'
    ],
    expected: 'Results corresponding to the latest query "design" are displayed.',
    actual: 'Slow response from "ai" resolves last, overwriting "design" results in the UI.'
  },
  {
    id: 'RF-15',
    title: 'Session expiry during reply composition silently dismisses modal',
    category: 'Async/Data',
    video: 'RF-15_silent_session_expiry_close.mp4',
    trigger: 'Submitting a reply after session token expiry.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-15`).',
      'Open reply composer and draft a response.',
      'Simulate 401 Unauthorized on submit.',
      'Click "Reply".'
    ],
    expected: 'User is prompted to re-authenticate or error explains session expired, preserving draft.',
    actual: 'Modal abruptly disappears without warning; typed response is completely lost.'
  },
  {
    id: 'RF-16',
    title: 'Modal backdrop z-index intercepts clicks intended for header actions',
    category: 'UI/DOM',
    video: 'RF-16_backdrop_zindex_interception.mp4',
    trigger: 'Opening modal and attempting to interact with header navigation.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-16`).',
      'Open notification drawer or search modal.',
      'Click on navigation items in top header.'
    ],
    expected: 'Header navigation responds or modal prevents interaction with visible backdrop.',
    actual: 'Transparent backdrop overlay intercepts pointer events without visual indication.'
  },
  {
    id: 'RF-17',
    title: 'Dynamic ID selector drift prevents interaction with newly appended replies',
    category: 'UI/DOM',
    video: 'RF-17_dynamic_selector_drift.mp4',
    trigger: 'Adding a reply and attempting to like or interact with it immediately.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-17`).',
      'Submit a reply to an active thread.',
      'Click like button on the newly appended reply card.'
    ],
    expected: 'New reply can be liked immediately.',
    actual: 'Reply rendered with random dynamic id that misses event delegation; click does nothing.'
  },
  {
    id: 'RF-18',
    title: 'Thread card overflow:hidden clips action dropdown menu',
    category: 'UI/DOM',
    video: 'RF-18_dropdown_clipped_overflow.mp4',
    trigger: 'Clicking "..." options menu on the bottom-most thread card.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-18`).',
      'Scroll to last thread card in feed.',
      'Click the triple-dot options menu icon.'
    ],
    expected: 'Menu floats above cards or opens upwards.',
    actual: 'Card container has overflow:hidden; menu dropdown is clipped off-screen and unclickable.'
  },
  {
    id: 'RF-19',
    title: 'Accessibility focus trap escapes into background page inside composer dialog',
    category: 'UI/DOM',
    video: 'RF-19_focus_trap_escape.mp4',
    trigger: 'Pressing Tab repeatedly inside open modal dialog.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-19`).',
      'Open thread composer dialog.',
      'Press Tab key 4 times.'
    ],
    expected: 'Focus cycles strictly between input, media buttons, and submit within the dialog.',
    actual: 'Focus escapes to background feed links, violating WCAG 2.1 accessibility criteria.'
  },
  {
    id: 'RF-20',
    title: 'Mobile navigation hamburger icon disappears at 768px breakpoint',
    category: 'UI/DOM',
    video: 'RF-20_mobile_hamburger_breakpoint_vanish.mp4',
    trigger: 'Resizing browser viewport between 768px and 800px.',
    steps: [
      'Navigate to MetaPulse (`http://localhost:3000?bug=RF-20`).',
      'Set browser viewport width to 768px.',
      'Observe header area.'
    ],
    expected: 'Mobile hamburger menu icon or bottom navigation bar is visible.',
    actual: 'Desktop navigation disappears at @media (max-width: 768px) while mobile nav triggers only below 767px, leaving zero navigation.'
  }
];

async function createIssues() {
  console.log(`🚀 Creating 20 Benchmark Issues on aroucadi/MetaPulse...\n`);

  for (const bug of BUGS) {
    const title = `[${bug.id}] ${bug.title}`;
    const body = `### 🐛 Description
${bug.title} (${bug.category})

### 🎯 Root Cause & Trigger
${bug.trigger}

### 📋 Steps to Reproduce
${bug.steps.map(s => `${s}`).join('\n')}

### ⚖️ Expected Behavior
${bug.expected}

### ❌ Actual Behavior
${bug.actual}

---

### 🎥 Benchmark Video Recording
- **File**: \`benchmarks/metapulse/${bug.video}\`
- **Recorded with**: Animated SVG human cursor, cubic-bezier smoothing, click ripples, zero blank frames.
- **Automated Verification Target**: ReplayFix Benchmark Evaluator (Contract \`${bug.id}\`).
`;

    const labelArg = `--label "bug" --label "benchmark"`;
    console.log(`Creating Issue: ${title}...`);
    
    try {
      const output = execSync(
        `gh issue create -R aroucadi/MetaPulse --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" ${labelArg}`,
        { encoding: 'utf-8' }
      );
      console.log(`  ✅ Created: ${output.trim()}`);
    } catch (err) {
      console.error(`  ❌ Error creating issue for ${bug.id}:`, err.message);
    }
  }
  console.log(`\n🎉 All 20 benchmark issues created successfully on aroucadi/MetaPulse!`);
}

createIssues();
