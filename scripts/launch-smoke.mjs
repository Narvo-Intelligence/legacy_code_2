#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const HOST = process.env.NARVO_SMOKE_HOST || '127.0.0.1';
const FRONTEND_PORT = Number(process.env.NARVO_SMOKE_FRONTEND_PORT || 3100);
const BACKEND_PORT = Number(process.env.NARVO_SMOKE_BACKEND_PORT || 8100);

const FRONTEND_URL = `http://${HOST}:${FRONTEND_PORT}`;
const BACKEND_URL = `http://${HOST}:${BACKEND_PORT}`;
const SESSION_COOKIE = 'narvo_demo_session=1';

function log(step, message) {
  process.stdout.write(`[${step}] ${message}\n`);
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function summarizeOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) return '(no output)';
  const lines = trimmed.split('\n');
  return lines.slice(-16).join('\n');
}

function startProcess(name, cmd, args, options = {}) {
  const child = spawn(cmd, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      log(name, `exited with code ${code}`);
    } else if (signal) {
      log(name, `exited via signal ${signal}`);
    }
  });

  return {
    name,
    child,
    getOutput() {
      return `${stdout}\n${stderr}`.trim();
    },
  };
}

async function runCommand(name, cmd, args, options = {}) {
  const proc = startProcess(name, cmd, args, options);

  const exit = await new Promise((resolve) => {
    proc.child.on('exit', (code, signal) => resolve({ code, signal }));
  });

  if (exit.code !== 0) {
    fail(`${name} failed\n${summarizeOutput(proc.getOutput())}`);
  }
  return proc.getOutput();
}

async function waitForHttp(url, { expectStatus = 200, timeoutMs = 90_000, headers } = {}) {
  const started = Date.now();
  let lastError = null;

  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual', headers });
      if (res.status === expectStatus) return res;
      lastError = new Error(`expected ${expectStatus}, got ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(1_000);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || 'unknown error'}`);
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    redirect: options.redirect || 'manual',
    headers: options.headers,
    signal: AbortSignal.timeout(options.timeoutMs || 15_000),
  });
  return res;
}

async function json(url, options) {
  const res = await request(url, options);
  if (!res.ok) fail(`${url} returned ${res.status}`);
  return res.json();
}

async function text(url, options) {
  const res = await request(url, options);
  if (!res.ok) fail(`${url} returned ${res.status}`);
  return res.text();
}

async function main() {
  const processes = [];

  const stopAll = async () => {
    for (const proc of processes.reverse()) {
      if (proc.child.exitCode === null) {
        proc.child.kill('SIGTERM');
        await delay(500);
        if (proc.child.exitCode === null) proc.child.kill('SIGKILL');
      }
    }
  };

  const onSignal = async (signal) => {
    log('cleanup', `received ${signal}`);
    await stopAll();
    process.exit(1);
  };

  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  try {
    log('backend', `starting at ${BACKEND_URL}`);
    const backend = startProcess(
      'backend',
      './.venv/bin/python',
      ['-m', 'uvicorn', 'server:app', '--host', HOST, '--port', String(BACKEND_PORT)],
      {
        cwd: new URL('../backend/', import.meta.url).pathname,
        env: {
          SENTRY_DSN: '',
          PORT: String(BACKEND_PORT),
        },
      }
    );
    processes.push(backend);
    await waitForHttp(`${BACKEND_URL}/api/health`);

    log('frontend', `starting at ${FRONTEND_URL}`);
    const frontend = startProcess(
      'frontend',
      'npm',
      ['run', 'dev', '--', '--hostname', HOST, '--port', String(FRONTEND_PORT)],
      {
        cwd: new URL('../frontend/', import.meta.url).pathname,
        env: {
          NEXT_PUBLIC_NARVO_API_URL: BACKEND_URL,
        },
      }
    );
    processes.push(frontend);
    await waitForHttp(`${FRONTEND_URL}/`);

    log('smoke', 'checking backend health');
    const health = await json(`${BACKEND_URL}/api/health`);
    assert(health?.status === 'online', 'backend health did not report online');

    log('smoke', 'checking landing page');
    const landingHtml = await text(`${FRONTEND_URL}/`);
    assert(/Narvo/i.test(landingHtml), 'landing page did not render Narvo markup');

    log('smoke', 'checking protected-route redirect');
    const dashboardRedirect = await request(`${FRONTEND_URL}/dashboard`);
    const dashboardLocation = dashboardRedirect.headers.get('location') || '';
    assert(
      dashboardRedirect.status >= 300 && dashboardRedirect.status < 400,
      `expected dashboard redirect, got ${dashboardRedirect.status}`
    );
    assert(
      dashboardLocation.includes('/auth') && dashboardLocation.includes('next=%2Fdashboard'),
      `dashboard redirect location unexpected: ${dashboardLocation || '(missing)'}`
    );

    log('smoke', 'checking guarded routes with Narvo session cookie');
    const gatedHeaders = { Cookie: SESSION_COOKIE };
    for (const path of ['/onboarding', '/dashboard', '/briefing', '/library']) {
      const res = await request(`${FRONTEND_URL}${path}`, { headers: gatedHeaders });
      assert(res.status === 200, `${path} should return 200 with demo session cookie, got ${res.status}`);
    }

    log('smoke', 'checking backend feed/share smoke via pytest');
    await runCommand(
      'pytest',
      './.venv/bin/pytest',
      ['tests/test_launch_smoke.py', '-q'],
      {
        cwd: new URL('../backend/', import.meta.url).pathname,
        env: { SENTRY_DSN: '' },
      }
    );

    log('result', 'Launch smoke checks passed');
    log('manual', 'Still verify in a real browser/device: Supabase sign-in, onboarding completion redirect, story autoplay handoff, audio playback start/completion, offline save to Library, and push permission flow.');
  } catch (error) {
    log('result', `Launch smoke failed: ${error.message}`);
    for (const proc of processes) {
      log(proc.name, summarizeOutput(proc.getOutput()));
    }
    await stopAll();
    process.exit(1);
  }

  await stopAll();
}

await main();
