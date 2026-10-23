/**
 * MetaPulse Bug Registry
 * 
 * Controls intentional bug injection for ReplayFix autonomous benchmark and demo.
 * Controlled via environment variable: BUG_ID=RF-01 (or 'none')
 * Also supports runtime query parameter ?bug=RF-01 for isolated interactive demonstration.
 */

const BUGS = {
  // Category 1: State / Logic (RF-01 to RF-05)
  'RF-01': {
    id: 'RF-01',
    name: 'Null CurrentUser State Dereference on Quote Repost',
    category: 'State/Logic',
    description: 'Attempting to quote-repost dereferences session.currentUser.profileId when session is undefined, causing uncaught TypeError and leaving modal stuck.'
  },
  'RF-02': {
    id: 'RF-02',
    name: 'Stale Follower Count Multi-Increment',
    category: 'State/Logic',
    description: 'Clicking follow button repeatedly increments count multiple times without debouncing state flag.'
  },
  'RF-03': {
    id: 'RF-03',
    name: 'Negative Character Counter Underflow',
    category: 'State/Logic',
    description: 'Character counter allows negative number and enables post button even when empty or exceeds limit.'
  },
  'RF-04': {
    id: 'RF-04',
    name: 'State Loss on Feed Category Tab Switch',
    category: 'State/Logic',
    description: 'Switching between "For you" and "Following" tabs completely clears thread compose draft state.'
  },
  'RF-05': {
    id: 'RF-05',
    name: 'Concurrent Like Race Condition De-sync',
    category: 'State/Logic',
    description: 'Rapid double-clicking on like icon causes frontend heart animation to show liked while backend decrements state.'
  },

  // Category 2: Form / Validation (RF-06 to RF-10)
  'RF-06': {
    id: 'RF-06',
    name: 'Whitespace Only Thread Submission',
    category: 'Form/Validation',
    description: 'Thread submission does not trim whitespace, allowing empty posts containing only spaces to be submitted.'
  },
  'RF-07': {
    id: 'RF-07',
    name: 'Profile Bio Input Length Bypass',
    category: 'Form/Validation',
    description: 'Bio input length check validates .length of raw HTML string rather than textContent, blocking valid submissions.'
  },
  'RF-08': {
    id: 'RF-08',
    name: 'Disabled Post Button Permanently Stuck',
    category: 'Form/Validation',
    description: 'After an initial validation error, the Post button remains disabled even after user enters valid text.'
  },
  'RF-09': {
    id: 'RF-09',
    name: 'Search Input Sanitization Regex Break',
    category: 'Form/Validation',
    description: 'Search query containing special regex characters (e.g. "?", "*") throws uncaught SyntaxError in client filter.'
  },
  'RF-10': {
    id: 'RF-10',
    name: 'Category Dropdown Reset on Submit Error',
    category: 'Form/Validation',
    description: 'Form submission error resets the selected topic category dropdown back to "general", losing user selection.'
  },

  // Category 3: Async / Data (RF-11 to RF-15)
  'RF-11': {
    id: 'RF-11',
    name: 'Stale Async Closure on Tab Switch',
    category: 'Async/Data',
    description: 'Switching tabs before fetch completes renders old tab threads into new tab view.'
  },
  'RF-12': {
    id: 'RF-12',
    name: 'Missing Await on Bookmark Persistence',
    category: 'Async/Data',
    description: 'Bookmark toggle redirects before network request completes, causing saved state to be lost on refresh.'
  },
  'RF-13': {
    id: 'RF-13',
    name: 'Unhandled 500 Network Error Hangs Spinner',
    category: 'Async/Data',
    description: 'API failure in thread replies endpoint lacks catch block; loading skeleton spins indefinitely.'
  },
  'RF-14': {
    id: 'RF-14',
    name: 'Typeahead Search Out-of-Order Response Race',
    category: 'Async/Data',
    description: 'Earlier slow search response arrives after newer fast response, overwriting accurate search results.'
  },
  'RF-15': {
    id: 'RF-15',
    name: 'Silent Session Expiry on Comment Submission',
    category: 'Async/Data',
    description: 'Expired session returns 401 but comment modal silently closes without showing login prompt or saving draft.'
  },

  // Category 4: UI / DOM Interaction (RF-16 to RF-20)
  'RF-16': {
    id: 'RF-16',
    name: 'Modal Backdrop Z-Index Click Interception',
    category: 'UI/DOM',
    description: 'Backdrop z-index overlays modal action buttons, making "Publish" and "Cancel" buttons unclickable.'
  },
  'RF-17': {
    id: 'RF-17',
    name: 'Dynamic Selector Drift on Re-render',
    category: 'UI/DOM',
    description: 'Thread like button generates dynamic random id on every render (#btn-like-r492), breaking static selectors.'
  },
  'RF-18': {
    id: 'RF-18',
    name: 'Dropdown Menu Clipped by Overflow Hidden',
    category: 'UI/DOM',
    description: 'More options dropdown inside thread card is clipped by parent container overflow: hidden.'
  },
  'RF-19': {
    id: 'RF-19',
    name: 'Focus Trap Escape to Background Page',
    category: 'UI/DOM',
    description: 'Tabbing inside thread modal escapes into background feed, making modal inaccessible for keyboard navigation.'
  },
  'RF-20': {
    id: 'RF-20',
    name: 'Mobile Hamburger Menu Breakpoint Vanish',
    category: 'UI/DOM',
    description: 'Responsive CSS hides desktop navigation at 768px but fails to display mobile bottom navigation bar.'
  }
};

function getActiveBug(req) {
  // Query param has highest priority for isolated test/demo replays
  if (req && req.query && req.query.bug) {
    const bug = req.query.bug.toUpperCase();
    if (BUGS[bug]) return BUGS[bug];
  }
  // Otherwise use environment variable
  const envBug = (process.env.BUG_ID || 'none').toUpperCase();
  return BUGS[envBug] || null;
}

module.exports = {
  BUGS,
  getActiveBug
};
