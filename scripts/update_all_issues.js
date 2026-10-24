const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ISSUES = [
  {
    num: 1,
    id: 'RF-01',
    title: '[RF-01] Quote Repost fails with TypeError: quoteContext is undefined',
    category: 'State/Logic',
    module: 'public/app.js (openQuoteModal / handleQuoteRepost)',
    video: 'RF-01_quote_repost_crash_with_cursor.mp4',
    severity: 'High',
    overview: 'Attempting to quote-repost any thread from the main community feed triggers an uncaught client-side runtime exception (`TypeError`). The quote composer modal fails to initialize properly, freezing the user interface in a semi-transparent disabled state that requires a hard page refresh to dismiss.',
    steps: [
      'Start the local MetaPulse server (`npm start`) and navigate to `http://localhost:3000?bug=RF-01`.',
      'Locate any active thread card in the feed.',
      'Click the triple-dot options / share button on the thread card.',
      'Select **"Quote Thread"** from the action dropdown menu.',
      'Inspect the browser developer console (`F12`).'
    ],
    expected: 'A composer modal opens containing an embedded read-only preview card of the quoted thread, with an active text input focused for the user commentary.',
    actual: 'Uncaught `TypeError: Cannot read properties of undefined (reading \'profileId\')`. The background dims, but the modal content fails to render and stays permanently unresponsive.',
    rootCause: `In \`public/app.js\`, the \`openQuoteModal(threadId)\` routine attempts to dereference \`session.currentUser.profileId\` before verifying that the active session object is defined and hydrated. When the session object is pending or unauthenticated, the expression throws an unhandled exception before the DOM nodes can mount.

\`\`\`javascript
// Failing Code Path in public/app.js
function openQuoteModal(threadId) {
  const quoteContext = session.currentUser.profileId; // 💥 TypeError if session is undefined
  mountQuotePreview(threadId, quoteContext);
}
\`\`\``
  },
  {
    num: 2,
    id: 'RF-02',
    title: '[RF-02] Follow button double-increments follower counter on rapid click',
    category: 'State/Logic',
    module: 'public/app.js (handleFollowToggle)',
    video: 'RF-02_stale_follower_increment.mp4',
    severity: 'Medium',
    overview: 'Clicking the "Follow" button on any user profile header or thread author trigger increments the displayed follower counter by +2 instead of +1. The operation lacks an optimistic debounce guard, causing concurrent event dispatch to execute duplicate increments.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-02`.',
      'Click on any user profile or thread author card to open their bio header.',
      'Note the initial follower count (e.g., `420 followers`).',
      'Click the **"Follow"** button.',
      'Observe the follower counter immediately incrementing to `422`.'
    ],
    expected: 'The follower counter increments strictly by 1 (from 420 to 421) and the button label toggles to "Following".',
    actual: 'Duplicate event listener attachment causes two independent increment cycles to dispatch, jumping the count by +2.',
    rootCause: `In \`public/app.js\`, \`attachProfileListeners()\` is invoked both on initial page mount and upon dynamically rendering thread cards without debouncing or unbinding previous event listeners. Clicking "Follow" triggers both handler closures simultaneously.

\`\`\`javascript
// Failing Code Path in public/app.js
followBtn.addEventListener('click', () => {
  followersCount += 1; // 💥 Executed twice per user click
  renderFollowersCount();
});
\`\`\``
  },
  {
    num: 3,
    id: 'RF-03',
    title: '[RF-03] Character counter underflows into negative numbers and allows submission',
    category: 'State/Logic',
    module: 'public/app.js (updateCharacterCounter / validateThreadContent)',
    video: 'RF-03_character_counter_underflow.mp4',
    severity: 'High',
    overview: 'The thread composer fails to clamp character count boundaries. When a user enters text exceeding the 500-character limit, the indicator counter displays negative numbers (e.g., `-14 / 500`) and the "Post" button remains enabled, submitting payload data that fails on the database tier.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-03`.',
      'Click **"Start a thread..."** in the main composer box.',
      'Type or paste a block of text containing 515 characters.',
      'Observe the character counter indicator badge at the bottom of the composer.',
      'Click the **"Post"** button.'
    ],
    expected: 'When character length exceeds 500, the counter turns red, displays remaining characters as 0 or overflow count, and the Post button is strictly disabled.',
    actual: 'The counter renders raw negative values (e.g. `-15`) and the Post button remains fully enabled and interactive.',
    rootCause: `The validation function calculates \`const remaining = MAX_CHARS - text.length;\` and updates innerText directly without verifying \`remaining >= 0\`. Furthermore, the submit button disable condition only checks \`text.length === 0\`, completely omitting an upper-bound check.

\`\`\`javascript
// Failing Code Path in public/app.js
charCounter.textContent = MAX_CHARS - input.value.length; // 💥 Can become negative
postBtn.disabled = input.value.length === 0; // 💥 Missing check for length > MAX_CHARS
\`\`\``
  },
  {
    num: 4,
    id: 'RF-04',
    title: '[RF-04] Draft state lost on modal backdrop click without confirmation',
    category: 'State/Logic',
    module: 'public/app.js (handleBackdropDismissal)',
    video: 'RF-04_draft_state_loss.mp4',
    severity: 'Medium',
    overview: 'Accidentally clicking anywhere outside the active composer modal immediately dismisses the dialog and erases all entered text without displaying a confirmation prompt or persisting draft state to localStorage.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-04`.',
      'Open the thread composer and type two paragraphs of text.',
      'Click on the dark semi-transparent backdrop overlay outside the modal dialog.',
      'Notice the modal closes immediately.',
      'Click "Start a thread..." again to re-open the composer.'
    ],
    expected: 'If the draft contains non-empty text, clicking the backdrop should either prompt "Discard draft?" or retain the draft for when the modal is re-opened.',
    actual: 'The dialog closes instantly on backdrop mousedown and clears the textarea value, causing irreversible data loss for the user.',
    rootCause: `The modal backdrop click handler unconditionally invokes \`closeComposerModal(true)\` which resets \`composerInput.value = ''\` regardless of whether the input contains uncommitted user data.

\`\`\`javascript
// Failing Code Path in public/app.js
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) {
    resetComposer(); // 💥 Destroys active user draft without guard
    closeModal();
  }
});
\`\`\``
  },
  {
    num: 5,
    id: 'RF-05',
    title: '[RF-05] Rapid like click causes optimistic counter race condition desync',
    category: 'State/Logic',
    module: 'public/app.js (toggleThreadLike)',
    video: 'RF-05_like_race_condition_desync.mp4',
    severity: 'Medium',
    overview: 'Double-clicking or rapidly toggling the heart/like button on a thread card causes a race condition between optimistic client state updates and asynchronous backend responses, resulting in an inverted state where the heart is highlighted red but the like counter decrements.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-05`.',
      'Locate any thread with like count (e.g. `12 likes`).',
      'Rapidly double-click the heart icon within 150ms.',
      'Observe the heart icon color and the numerical counter value.'
    ],
    expected: 'The final state matches the server resolution, maintaining mathematical parity between active like state and count.',
    actual: 'The heart icon reflects an active liked state (crimson red fill) while the counter decreases to `11` instead of `13`.',
    rootCause: `\`toggleThreadLike\` lacks request concurrency locking (no \`AbortController\` or in-flight mutation mutex). The first request returns after the second has already updated local state, overwriting client state with stale values.

\`\`\`javascript
// Failing Code Path in public/app.js
async function toggleThreadLike(id) {
  // 💥 Missing isSubmitting mutex or AbortController
  isLiked = !isLiked;
  const res = await fetch(\`/api/threads/\${id}/like\`, { method: 'POST' });
  const data = await res.json();
  updateLikesUI(data.likesCount); // 💥 Overwrites newer optimistic state
}
\`\`\``
  },
  {
    num: 6,
    id: 'RF-06',
    title: '[RF-06] Whitespace-only thread content passes validation and gets published',
    category: 'Form/Validation',
    module: 'public/app.js (validatePostInput / handlePostSubmit)',
    video: 'RF-06_whitespace_only_thread.mp4',
    severity: 'Medium',
    overview: 'The thread creation form validates input length using `.length > 0` rather than `.trim().length > 0`. Users can type spaces or newlines and press "Post", injecting completely blank, invisible cards into the public feed.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-06`.',
      'Open the thread composer modal.',
      'Press Spacebar three times and press Enter twice (no visible characters).',
      'Observe the "Post" button state.',
      'Click **"Post"**.'
    ],
    expected: 'The Post button remains disabled while input consists strictly of whitespace characters.',
    actual: 'The Post button enables and successfully submits an HTTP POST request, inserting an empty card into the timeline.',
    rootCause: `Validation checks \`if (textarea.value.length > 0)\` without sanitizing whitespace through \`String.prototype.trim()\`.

\`\`\`javascript
// Failing Code Path in public/app.js
textarea.addEventListener('input', () => {
  submitBtn.disabled = textarea.value.length === 0; // 💥 "   ".length is 3, enabling submit
});
\`\`\``
  },
  {
    num: 7,
    id: 'RF-07',
    title: '[RF-07] Profile bio length validation checks raw HTML string instead of text',
    category: 'Form/Validation',
    module: 'public/app.js (validateBioInput / saveProfile)',
    video: 'RF-07_bio_length_raw_html_bypass.mp4',
    severity: 'Medium',
    overview: 'When editing user profile bio, the validation routine inspects the `.length` of the rich-text container\'s raw `innerHTML` rather than plain `textContent`. Entering text with quotes, ampersands, or entity markup falsely triggers a character limit overflow error.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-07`.',
      'Click "Edit Profile" on the current user card.',
      'In the Bio field, enter: `Full-stack engineer & AI researcher <building cool tools>`.',
      'Observe the character counter reading 82/160.',
      'Click **"Save Profile"**.'
    ],
    expected: 'Profile saves successfully since plain-text length (55 characters) is well within the 160-character ceiling.',
    actual: 'Validation error appears: "Bio exceeds maximum allowed length", because encoded markup strings inflated internal string length.',
    rootCause: `\`validateBio\` checks \`bioElement.innerHTML.length\` rather than \`bioElement.innerText.trim().length\`.

\`\`\`javascript
// Failing Code Path in public/app.js
function validateBio(el) {
  if (el.innerHTML.length > MAX_BIO_LENGTH) { // 💥 Raw HTML tags inflate length
    showError("Bio exceeds maximum allowed length");
  }
}
\`\`\``
  },
  {
    num: 8,
    id: 'RF-08',
    title: '[RF-08] Disabled Post button remains stuck disabled after correcting input',
    category: 'Form/Validation',
    module: 'public/app.js (handleComposerKeyup)',
    video: 'RF-08_disabled_post_button_stuck.mp4',
    severity: 'High',
    overview: 'If a user opens the composer, types text, and backspaces to clear the input, the Post button correctly disables. However, typing valid text afterwards fails to re-enable the button, leaving the user unable to post without reloading.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-08`.',
      'Open the thread composer.',
      'Type "Hello world", then hit Backspace until the field is empty.',
      'Verify the "Post" button is disabled.',
      'Type a brand new thread message: "Testing production feed".',
      'Attempt to click the "Post" button.'
    ],
    expected: 'The "Post" button should automatically re-enable as soon as valid text is present.',
    actual: 'The button remains permanently disabled with `disabled="true"` attribute locked in place.',
    rootCause: `The input listener binds to \`change\` rather than \`input\` / \`keyup\`, failing to fire state evaluation during standard keyboard entry once the disabled state is applied.

\`\`\`javascript
// Failing Code Path in public/app.js
composerInput.addEventListener('change', () => { // 💥 Only triggers on blur/commit, not keystrokes
  updateSubmitState();
});
\`\`\``
  },
  {
    num: 9,
    id: 'RF-09',
    title: '[RF-09] Search bar crashes client filter when entering regex special characters',
    category: 'Form/Validation',
    module: 'public/app.js (filterThreadsByQuery)',
    video: 'RF-09_search_regex_break.mp4',
    severity: 'High',
    overview: 'Entering regular expression control characters such as `[`, `(`, `*`, or `\\` directly into the feed search bar throws an uncaught client-side `SyntaxError: Invalid regular expression`. This completely crashes thread rendering and leaves the feed empty.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-09`.',
      'Click the Search input field in the top navigation bar.',
      'Type `[AI]` or `(update)`.',
      'Check the browser developer console.'
    ],
    expected: 'The search performs a literal substring search and displays matching threads or "No matching threads found".',
    actual: 'Uncaught `SyntaxError: Unterminated character class`. All existing threads vanish from the screen.',
    rootCause: `\`filterThreadsByQuery\` constructs a dynamic \`RegExp\` directly from raw user input without passing the string through an escape function.

\`\`\`javascript
// Failing Code Path in public/app.js
function filterThreads(query) {
  const regex = new RegExp(query, 'i'); // 💥 SyntaxError when query has unclosed '[' or '('
  return allThreads.filter(t => regex.test(t.content));
}
\`\`\``
  },
  {
    num: 10,
    id: 'RF-10',
    title: '[RF-10] Category filter dropdown resets to "All" upon pagination or submit error',
    category: 'Form/Validation',
    module: 'public/app.js (renderPagination / refreshFeed)',
    video: 'RF-10_category_dropdown_reset.mp4',
    severity: 'Low',
    overview: 'When a user filters the community feed by a specific topic (e.g. "Technology" or "Design"), scrolling down to load additional page results resets the active category dropdown select element back to "All", desynchronizing UI controls from active feed query state.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-10`.',
      'Select **"Technology"** in the category dropdown filter.',
      'Scroll down to the bottom of the feed to trigger infinite scroll / page 2 fetch.',
      'Look at the category dropdown element in the filter bar.'
    ],
    expected: 'The dropdown continues to display "Technology" as active category.',
    actual: 'The dropdown resets its display value back to "all", even though the feed is displaying filtered items.',
    rootCause: `The feed re-render template recreates the category dropdown DOM tree on every pagination fetch without restoring the \`selected\` attribute of the active category.

\`\`\`javascript
// Failing Code Path in public/app.js
function renderFilterBar() {
  categorySelect.innerHTML = \`<option value="all" selected>All Categories</option>...\`; // 💥 Hardcoded 'selected'
}
\`\`\``
  },
  {
    num: 11,
    id: 'RF-11',
    title: '[RF-11] Stale tab switch closure leaks old tab scroll listeners',
    category: 'Async/Data',
    module: 'public/app.js (switchFeedTab / handleInfiniteScroll)',
    video: 'RF-11_stale_tab_switch_closure.mp4',
    severity: 'Medium',
    overview: 'Switching between the "For you" and "Following" tabs fails to unbind previous window scroll listeners. As the user scrolls on the new tab, ghost pagination handlers continue requesting and appending items from the previous tab into the current view.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-11`.',
      'Click the **"Following"** tab.',
      'Immediately click back to the **"For you"** tab.',
      'Scroll down rapidly to load subsequent pages.'
    ],
    expected: 'Only threads belonging to the active "For you" category are fetched and appended.',
    actual: 'Items from both tabs intermingle in the feed due to concurrent uncleaned scroll event listeners.',
    rootCause: `\`switchFeedTab\` registers an anonymous function with \`window.addEventListener('scroll', ...)\` on each tab click without removing previous listeners.

\`\`\`javascript
// Failing Code Path in public/app.js
function switchFeedTab(newTab) {
  currentTab = newTab;
  // 💥 Missing window.removeEventListener('scroll', oldHandler)
  window.addEventListener('scroll', () => fetchMore(newTab));
}
\`\`\``
  },
  {
    num: 12,
    id: 'RF-12',
    title: '[RF-12] Bookmark button missing await causes UI state reversion on refresh',
    category: 'Async/Data',
    module: 'public/app.js (handleBookmarkToggle)',
    video: 'RF-12_missing_await_bookmark_desync.mp4',
    severity: 'Medium',
    overview: 'Clicking the bookmark button updates the UI icon immediately, but the persistence function omits the \`await\` keyword before resolving or navigating. If the user navigates to the "Bookmarks" tab shortly after, the saved thread is missing.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-12`.',
      'Locate any thread and click the bookmark ribbon icon.',
      'Verify the ribbon turns solid blue (active bookmark visual).',
      'Click the "Bookmarks" tab in the navigation menu.'
    ],
    expected: 'The bookmarked thread appears in the Bookmarks collection.',
    actual: 'The Bookmarks collection is empty; navigating interrupted the unawaited asynchronous HTTP PUT request.',
    rootCause: `\`handleBookmarkToggle\` executes the network mutation without \`await\`, allowing navigation or page state transition to abort the in-flight request.

\`\`\`javascript
// Failing Code Path in public/app.js
function handleBookmarkToggle(id) {
  setBookmarkUI(true);
  saveBookmarkToServer(id); // 💥 Missing 'await' before signaling completion
}
\`\`\``
  },
  {
    num: 13,
    id: 'RF-13',
    title: '[RF-13] Unhandled 500 error leaves loading skeleton spinner running indefinitely',
    category: 'Async/Data',
    module: 'public/app.js (fetchThreadReplies)',
    video: 'RF-13_unhandled_500_spinner_hang.mp4',
    severity: 'Medium',
    overview: 'When the backend encounters an internal server error (HTTP 500) during reply retrieval, the client-side promise chain lacks a `.catch()` rejection handler. The loading skeleton spinner runs indefinitely with zero user feedback.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-13`.',
      'Click on a thread configured to return an error response on replies fetch.',
      'Observe the reply section of the thread details drawer.'
    ],
    expected: 'The spinner stops, and a retry error card appears: "Failed to load replies. Tap to retry."',
    actual: 'The pulsating skeleton loader spins endlessly; the user is given no indication of server failure.',
    rootCause: `The fetch call lacks error handling:

\`\`\`javascript
// Failing Code Path in public/app.js
fetch(\`/api/threads/\${id}/replies\`)
  .then(res => res.json())
  .then(data => renderReplies(data)); // 💥 Missing .catch(err => renderErrorState(err))
\`\`\``
  },
  {
    num: 14,
    id: 'RF-14',
    title: '[RF-14] Typeahead search race condition: slow response overwrites newer results',
    category: 'Async/Data',
    module: 'public/app.js (handleTypeaheadInput)',
    video: 'RF-14_search_race_condition.mp4',
    severity: 'Medium',
    overview: 'Typing rapidly into the search field triggers multiple overlapping asynchronous API calls. A slower network response from an earlier keystroke resolves after a faster response from a newer keystroke, overwriting search results with stale data.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-14`.',
      'Focus the search box and type "ai".',
      'Wait approximately 150ms and type "design" (full query "aidesign").',
      'Wait for all network requests to complete.'
    ],
    expected: 'The search results list displays matches for "aidesign".',
    actual: 'The delayed response for "ai" completes last and overwrites the view, displaying irrelevant results.',
    rootCause: `There is no monotonic request sequence tracker or \`AbortController\` to cancel previous in-flight search queries.

\`\`\`javascript
// Failing Code Path in public/app.js
async function searchThreads(q) {
  const res = await fetch(\`/api/search?q=\${q}\`);
  const data = await res.json();
  renderResults(data); // 💥 Stale closure resolves out of order
}
\`\`\``
  },
  {
    num: 15,
    id: 'RF-15',
    title: '[RF-15] Session expiry during reply composition silently dismisses modal',
    category: 'Async/Data',
    module: 'public/app.js (submitThreadReply)',
    video: 'RF-15_silent_session_expiry_close.mp4',
    severity: 'High',
    overview: 'When a user submits a reply after their authentication session token expires, the server returns an HTTP 401 Unauthorized response. The client treats any response as completion and closes the modal dialog, discarding the draft without notifying the user.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-15`.',
      'Open any thread and write a detailed response in the reply composer.',
      'Click **"Reply"**.',
      'Observe the modal and timeline.'
    ],
    expected: 'Modal stays open, preserving draft text, and displays an inline toast: "Session expired. Please sign in to reply."',
    actual: 'The modal vanishes instantly with zero warning; the user\'s comment is never published and cannot be recovered.',
    rootCause: `The response handler calls \`closeReplyModal()\` in a \`finally\` block without inspecting \`res.ok\` or \`res.status === 401\`.

\`\`\`javascript
// Failing Code Path in public/app.js
fetch('/api/replies', { method: 'POST', body: payload })
  .finally(() => {
    closeReplyModal(); // 💥 Closes modal even on HTTP 401 / 500 failures
  });
\`\`\``
  },
  {
    num: 16,
    id: 'RF-16',
    title: '[RF-16] Modal backdrop z-index intercepts clicks intended for header actions',
    category: 'UI/DOM',
    module: 'public/styles.css (.modal-backdrop / header navigation)',
    video: 'RF-16_backdrop_zindex_interception.mp4',
    severity: 'Medium',
    overview: 'The CSS modal backdrop overlay is assigned a `z-index: 10000` without isolating header navigation. Clicking header actions (like Home, Profile, or Theme toggle) while a drawer or modal is open results in click interception by the invisible backdrop layer.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-16`.',
      'Open the notification drawer.',
      'Attempt to click the "Home" icon in the top header navigation.',
      'Observe header button response.'
    ],
    expected: 'Header action is clickable or visual backdrop clearly covers the header to signify non-interactive state.',
    actual: 'The button visually looks clickable but clicks are silently swallowed by the oversized backdrop stacking context.',
    rootCause: `In \`public/styles.css\`, \`.modal-backdrop\` has a higher z-index than \`.app-header\` without an appropriate stacking context isolation.

\`\`\`css
/* Failing CSS in public/styles.css */
.modal-backdrop {
  z-index: 99999; /* 💥 Overlaps .app-header (z-index: 1000) */
  position: fixed;
  inset: 0;
}
\`\`\``
  },
  {
    num: 17,
    id: 'RF-17',
    title: '[RF-17] Dynamic ID selector drift prevents interaction with newly appended replies',
    category: 'UI/DOM',
    module: 'public/app.js (renderReplyCard)',
    video: 'RF-17_dynamic_selector_drift.mp4',
    severity: 'Medium',
    overview: 'When rendering dynamically submitted replies, the client generates unstable, randomized DOM ID selectors (e.g. `id="reply-item-r9821"`). Subsequent event delegations looking for standard predictable IDs fail to bind, rendering action buttons on new replies unresponsive.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-17`.',
      'Open any thread and submit a reply: "Looks great!".',
      'Locate the newly appended reply card in the drawer.',
      'Click the heart / like icon on the new reply.'
    ],
    expected: 'The newly posted reply updates its like count and triggers visual heart animation.',
    actual: 'The click is ignored because event delegation expects `#reply-{id}` but receives a dynamic random string.',
    rootCause: `\`renderReplyCard\` uses \`Math.random()\` to generate element IDs instead of the deterministic entity ID from the server response.

\`\`\`javascript
// Failing Code Path in public/app.js
replyEl.id = \`reply-item-r\${Math.floor(Math.random() * 10000)}\`; // 💥 Dynamic ID drift
\`\`\``
  },
  {
    num: 18,
    id: 'RF-18',
    title: '[RF-18] Thread card overflow:hidden clips action dropdown menu',
    category: 'UI/DOM',
    module: 'public/styles.css (.thread-card / .dropdown-menu)',
    video: 'RF-18_dropdown_clipped_overflow.mp4',
    severity: 'Medium',
    overview: 'The thread card container styles enforce `overflow: hidden` for rounded border clipping. When opening the triple-dot options menu on cards near the bottom of the feed, the dropdown menu is partially clipped and items become inaccessible.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-18`.',
      'Scroll down to the last thread in the feed.',
      'Click the triple-dot "..." button on the thread card.',
      'Look at the bottom of the card.'
    ],
    expected: 'The dropdown menu renders above all neighboring elements using fixed positioning or upward flipping.',
    actual: 'The dropdown menu is clipped by the bottom border of the card; "Report" and "Mute" options cannot be seen or clicked.',
    rootCause: `\`public/styles.css\` contains \`overflow: hidden\` on \`.thread-card\` without using portal or \`position: fixed\` for popovers.

\`\`\`css
/* Failing CSS in public/styles.css */
.thread-card {
  overflow: hidden; /* 💥 Clips child elements extending beyond card bounds */
  position: relative;
}
\`\`\``
  },
  {
    num: 19,
    id: 'RF-19',
    title: '[RF-19] Accessibility focus trap escapes into background page inside composer dialog',
    category: 'UI/DOM',
    module: 'public/app.js (handleComposerKeyDown)',
    video: 'RF-19_focus_trap_escape.mp4',
    severity: 'Medium',
    overview: 'When the thread composer modal dialog is open, pressing the Tab key repeatedly cycles keyboard focus outside the modal boundaries into the invisible background feed, violating WCAG 2.1 Success Criterion 2.1.2 (No Keyboard Trap).',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-19`.',
      'Open the thread composer modal.',
      'Focus the main textarea input.',
      'Press the **Tab** key 4 times.'
    ],
    expected: 'Keyboard focus cycles through the modal elements: textarea ➔ media button ➔ cancel ➔ post ➔ textarea.',
    actual: 'Focus escapes to background feed cards and links behind the darkened modal backdrop.',
    rootCause: `The modal lacks an accessibility keydown listener that intercepts \`Tab\` and wraps focus back to the first focusable child when \`activeElement === lastFocusable\`.

\`\`\`javascript
// Missing Focus Trap in public/app.js
modal.addEventListener('keydown', (e) => {
  // 💥 Missing focus trap logic for e.key === 'Tab'
});
\`\`\``
  },
  {
    num: 20,
    id: 'RF-20',
    title: '[RF-20] Mobile navigation hamburger icon disappears at 768px breakpoint',
    category: 'UI/DOM',
    module: 'public/styles.css (@media responsive rules)',
    video: 'RF-20_mobile_hamburger_breakpoint_vanish.mp4',
    severity: 'Medium',
    overview: 'A CSS breakpoint mismatch in `styles.css` causes navigation to completely disappear at exactly 768px viewport width. The desktop navigation hides at `max-width: 768px` while the mobile hamburger navigation displays only at `max-width: 767px`.',
    steps: [
      'Navigate to `http://localhost:3000?bug=RF-20`.',
      'Open browser Developer Tools and toggle device emulation.',
      'Set viewport width to exactly `768px` (iPad portrait standard).',
      'Examine the top and bottom navigation bars.'
    ],
    expected: 'Either the desktop navigation is visible or the mobile hamburger bar is rendered.',
    actual: 'Neither navigation element renders. The navigation region is completely blank.',
    rootCause: `Off-by-one pixel gap in media query declarations:

\`\`\`css
/* Failing CSS in public/styles.css */
@media (max-width: 768px) {
  .desktop-nav { display: none; } /* 💥 Hides desktop at 768px */
}

@media (max-width: 767px) {
  .mobile-nav { display: flex; } /* 💥 Only shows mobile below 767px */
}
\`\`\``
  }
];

async function updateIssues() {
  console.log(`🚀 Updating all 20 GitHub issues on aroucadi/MetaPulse with pristine markdown...\n`);

  const tempDir = path.join(__dirname, '..', 'artifacts', 'temp_issues');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  for (const item of ISSUES) {
    // Clean up steps to reference native git branch reproduction
    const cleanSteps = item.steps.map(s => {
      return s.replace(/\s*\(?http:\/\/localhost:3000\?bug=RF-\d+\)?/g, ' `http://localhost:3000`')
              .replace(/Start the local MetaPulse server \(`npm start`\) and navigate to `http:\/\/localhost:3000`\./, 'Start the server (`npm start`) and navigate to `http://localhost:3000`.')
              .replace(/Navigate to `http:\/\/localhost:3000`\./, 'Navigate to `http://localhost:3000`.');
    });

    const bodyContent = `### 📌 Defect Overview
${item.overview}

---

### 🖥️ Component & Environment
- **Target Application**: MetaPulse Web Monolith
- **Affected Module**: \`${item.module}\`
- **Benchmark Defect ID**: \`${item.id}\`
- **Reproduction Branch**: [\`bug/${item.id}\`](https://github.com/aroucadi/MetaPulse/tree/bug/${item.id})
- **Clean Baseline**: [\`main\`](https://github.com/aroucadi/MetaPulse/tree/main)
- **Severity**: ${item.severity}

---

### 📋 Steps to Reproduce (SWE-bench Standard)
1. Check out the isolated benchmark branch:
   \`\`\`bash
   git checkout bug/${item.id}
   npm start
   \`\`\`
2. Open your browser and navigate to \`http://localhost:3000\`.
${cleanSteps.filter((_, idx) => idx > 0).map((s, idx) => `${idx + 3}. ${s}`).join('\n')}

---

### ⚖️ Expected vs. Actual Behavior

| Expected Behavior | Observed Bug (Actual) |
| :--- | :--- |
| ${item.expected} | ${item.actual} |

---

### 🔬 Technical Root Cause Analysis
${item.rootCause}

---

### 🎥 Autonomous ReplayFix Evaluation Artifacts
- **Ground-Truth Recording**: [\`benchmarks/metapulse/${item.video}\`](https://github.com/aroucadi/MetaPulse/blob/main/artifacts/videos/${item.video})
- **Visual Telemetry**: Injected SVG human pointer with cubic-bezier spline interpolation, visual click ripples, and 0.00s blank frame trimming.
- **Oracle Verification Spec**: \`tests/regression.spec.js\` ➔ Contract \`${item.id}\`
`;

    const filePath = path.join(tempDir, `issue_${item.num}.md`);
    fs.writeFileSync(filePath, bodyContent, 'utf-8');

    console.log(`Updating Issue #${item.num} (${item.id}): ${item.title}...`);
    try {
      execSync(
        `gh issue edit ${item.num} -R aroucadi/MetaPulse --title "${item.title.replace(/"/g, '\\"')}" --body-file "${filePath}"`,
        { encoding: 'utf-8' }
      );
      console.log(`  ✅ Successfully updated #${item.num}`);
    } catch (err) {
      console.error(`  ❌ Error updating #${item.num}:`, err.message);
    }
  }

  console.log(`\n🎉 All 20 issues updated with immaculate formatting on aroucadi/MetaPulse!`);
}

updateIssues();
