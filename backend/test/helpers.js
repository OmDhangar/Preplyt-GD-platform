/**
 * Shared test harness used by api-test.js and socket-test.js.
 * No external dependencies — uses Node 18+ native fetch.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

// ── ANSI colors (no chalk dependency needed) ───────────────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  gray:   (s) => `\x1b[90m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

// ── Test run state ──────────────────────────────────────────────────────────
const stats = { passed: 0, failed: 0, skipped: 0, failures: [] };

/**
 * Print a section header.
 */
function section(title) {
  console.log('\n' + c.bold(c.cyan(`▶ ${title}`)));
  console.log(c.gray('─'.repeat(60)));
}

/**
 * Run a single named test. Catches errors so the suite keeps going.
 * `fn` may return a value — useful for passing IDs/tokens to later tests.
 */
async function test(name, fn) {
  try {
    const result = await fn();
    stats.passed++;
    console.log(`  ${c.green('✓')} ${name}`);
    return result;
  } catch (err) {
    stats.failed++;
    stats.failures.push({ name, error: err.message });
    console.log(`  ${c.red('✗')} ${name}`);
    console.log(`    ${c.red(err.message)}`);
    return null;
  }
}

/**
 * Skip a test with a reason (e.g. missing Razorpay credentials).
 */
function skip(name, reason) {
  stats.skipped++;
  console.log(`  ${c.yellow('○')} ${name} ${c.gray(`(skipped: ${reason})`)}`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEqual(actual, expected, label = 'value') {
  if (actual !== expected) {
    throw new Error(`Expected ${label} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertStatus(res, expected, context = '') {
  if (res.status !== expected) {
    throw new Error(
      `${context} → expected HTTP ${expected}, got ${res.status}. Body: ${JSON.stringify(res.data)}`
    );
  }
}

let rateLimitWarned = false;

/**
 * Core HTTP client. Returns { status, data }.
 */
async function api(method, path, { body, token, rawBody, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  let finalBody;

  if (rawBody !== undefined) {
    finalBody = rawBody; // used for webhook raw-body testing
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
  });

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (res.status === 429 && !rateLimitWarned) {
    rateLimitWarned = true;
    console.log(
      `\n  ${c.yellow('⚠ Hit a rate limit (429).')} This test suite fires ~100 requests.\n` +
      `  ${c.gray('Raise RATE_LIMIT_MAX (and RATE_LIMIT_WINDOW_MS if needed) in .env, restart the server, and re-run.')}\n`
    );
  }

  return { status: res.status, data };
}

/** Generates a unique-ish suffix so repeated test runs don't collide on unique fields. */
function uniqueSuffix() {
  return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function printSummary() {
  console.log('\n' + c.bold('═'.repeat(60)));
  console.log(c.bold('  TEST SUMMARY'));
  console.log(c.bold('═'.repeat(60)));
  console.log(`  ${c.green(`Passed:  ${stats.passed}`)}`);
  console.log(`  ${c.red(`Failed:  ${stats.failed}`)}`);
  console.log(`  ${c.yellow(`Skipped: ${stats.skipped}`)}`);

  if (stats.failures.length) {
    console.log('\n' + c.red(c.bold('  Failures:')));
    stats.failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      console.log(`     ${c.gray(f.error)}`);
    });
  }
  console.log(c.bold('═'.repeat(60)) + '\n');

  process.exitCode = stats.failed > 0 ? 1 : 0;
}

module.exports = {
  BASE_URL, c, api, test, skip, assert, assertEqual, assertStatus,
  uniqueSuffix, section, printSummary, stats,
};