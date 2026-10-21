import { spawn, execFile, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { config } from "../config.js";
import { sleep } from "./time.js";

const execFileAsync = promisify(execFile);

type SubmitState = {
  lastAttemptAt: string | null;
  lastSpamAt: string | null;
  lastOkAt: string | null;
};

type ChromeSession = {
  browser: Browser;
  proc: ChildProcess | null;
  chromePid: number | null;
  userDataDir: string;
  owned: boolean;
};

const STATE_PATH = () => path.join(config.dataDir, "submit-state.json");
const CHROME_DIR = () => path.join(config.dataDir, "chrome-user-data");

let session: ChromeSession | null = null;
/** User restored the submit Chrome window; never minimize or close that tab again. */
let userRestoredSubmitWindow = false;
let didMinimizeSubmitWindow = false;

function loadState(): SubmitState {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_PATH(), "utf8")) as Partial<SubmitState>;
    return {
      lastAttemptAt: parsed.lastAttemptAt ?? null,
      lastSpamAt: parsed.lastSpamAt ?? null,
      lastOkAt: parsed.lastOkAt ?? null,
    };
  } catch {
    return { lastAttemptAt: null, lastSpamAt: null, lastOkAt: null };
  }
}

function saveState(next: SubmitState) {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(STATE_PATH(), JSON.stringify(next, null, 2));
}

function remainingMs(iso: string | null, cooldown: number): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, cooldown - (Date.now() - t));
}

function formatWait(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  return min === 1 ? "1 minute" : `${min} minutes`;
}

export function assertSubmitAllowed(): void {
  const state = loadState();
  const afterSpam = remainingMs(state.lastSpamAt, config.submitSpamCooldownMs);
  if (afterSpam > 0) {
    throw new Error(
      `Ashby flagged a recent submit as spam. Their own copy says wait, turn off any VPN/proxy, and use your normal network — not a retry from the same session. Wait ${formatWait(afterSpam)} then Approve again.`,
    );
  }
  const gap = remainingMs(state.lastAttemptAt, config.submitCooldownMs);
  if (gap > 0) {
    throw new Error(
      `Too soon to submit another Ashby application from this browser. Wait ${formatWait(gap)} so the next one is not clustered with the last attempt.`,
    );
  }
}

export function recordSubmitResult(kind: "ok" | "spam" | "fail"): void {
  const state = loadState();
  const now = new Date().toISOString();
  state.lastAttemptAt = now;
  if (kind === "spam") state.lastSpamAt = now;
  if (kind === "ok") state.lastOkAt = now;
  saveState(state);
}

export function chromeUserDataDir(): string {
  const dir = CHROME_DIR();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function defaultChromePath(): string | null {
  if (config.submitChromePath && fs.existsSync(config.submitChromePath)) {
    return config.submitChromePath;
  }
  if (process.platform === "darwin") {
    const p = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (fs.existsSync(p)) return p;
  }
  if (process.platform === "win32") {
    const p = path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google/Chrome/Application/chrome.exe");
    if (fs.existsSync(p)) return p;
  }
  for (const bin of ["google-chrome-stable", "google-chrome", "chromium-browser", "chromium"]) {
    const dirs = ["/usr/bin", "/usr/local/bin"];
    for (const dir of dirs) {
      const p = path.join(dir, bin);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

async function readDevtoolsPort(userDataDir: string, timeoutMs: number): Promise<number> {
  const file = path.join(userDataDir, "DevToolsActivePort");
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(file)) {
      const line = fs.readFileSync(file, "utf8").split("\n")[0]?.trim() ?? "";
      const port = Number(line);
      if (port > 0 && (await portOpen(port))) return port;
    }
    await sleep(200);
  }
  throw new Error("Google Chrome did not open a debugging port");
}

function hideAutomationScript(): string {
  return `(() => {
    try {
      Object.defineProperty(Navigator.prototype, "webdriver", {
        get: () => undefined,
        configurable: true,
      });
    } catch {}
  })()`;
}

async function attachAutomationHides(context: BrowserContext): Promise<void> {
  await context.addInitScript(hideAutomationScript());
}

async function connectCdp(url: string): Promise<Browser> {
  return chromium.connectOverCDP(url, { slowMo: 45 });
}

function chromeLaunchArgs(userDataDir: string): string[] {
  const args = [
    `--user-data-dir=${userDataDir}`,
    "--remote-debugging-port=0",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-session-crashed-bubble",
    "--hide-crash-restore-bubble",
    "--disable-features=ChromeWhatsNewUI,Translate",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-background-timer-throttling",
    "--window-size=1280,900",
  ];
  if (config.submitChromeBackground) {
    args.push("--no-startup-window");
    if (process.platform === "win32") args.push("--start-minimized");
    else args.push("--window-position=-2000,80");
  }
  return args;
}

function chromeProfileLooksRunning(userDataDir: string): boolean {
  return (
    fs.existsSync(path.join(userDataDir, "DevToolsActivePort")) ||
    fs.existsSync(path.join(userDataDir, "SingletonLock"))
  );
}

async function pidListeningOn(port: number): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
    const pid = Number(stdout.trim().split(/\s+/)[0]);
    return pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function yieldMacFocus(pid: number | null | undefined): void {
  if (process.platform !== "darwin" || !pid) return;
  spawn(
    "osascript",
    ["-e", `tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to false`],
    { stdio: "ignore" },
  );
}

async function readWindowState(page: Page): Promise<string | null> {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId } = (await cdp.send("Browser.getWindowForTarget")) as { windowId: number };
    const { bounds } = (await cdp.send("Browser.getWindowBounds", { windowId })) as {
      bounds?: { windowState?: string };
    };
    await cdp.detach().catch(() => undefined);
    return bounds?.windowState ?? null;
  } catch {
    return null;
  }
}

async function markRestoredIfUserOpened(page: Page): Promise<void> {
  if (userRestoredSubmitWindow) return;
  const state = await readWindowState(page);
  if (state && state !== "minimized") {
    userRestoredSubmitWindow = true;
  }
}

async function minimizeSubmitWindowOnce(page: Page): Promise<void> {
  if (!config.submitChromeBackground || !session?.owned || userRestoredSubmitWindow) return;
  if (didMinimizeSubmitWindow) return;
  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId } = (await cdp.send("Browser.getWindowForTarget")) as { windowId: number };
    await cdp.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "minimized" },
    });
    await cdp.detach().catch(() => undefined);
    didMinimizeSubmitWindow = true;
  } catch {
    /* window is already gone or CDP window APIs unavailable */
  }
  yieldMacFocus(session.chromePid);
}

async function launchChromeProcess(userDataDir: string): Promise<ChildProcess | null> {
  const chromePath = defaultChromePath();
  if (!chromePath) {
    throw new Error("Google Chrome is not installed. Ashby flags Playwright Chromium as spam; install Chrome and retry.");
  }
  const args = chromeLaunchArgs(userDataDir);
  const proc = spawn(chromePath, args, { stdio: "ignore", detached: false });
  if (config.submitChromeBackground) yieldMacFocus(proc.pid);
  return proc;
}

async function connectOwned(port: number, proc: ChildProcess | null, userDataDir: string): Promise<ChromeSession> {
  const browser = await connectCdp(`http://127.0.0.1:${port}`);
  const chromePid = proc?.pid ?? (await pidListeningOn(port));
  if (!userRestoredSubmitWindow) yieldMacFocus(chromePid);
  return { browser, proc, chromePid, userDataDir, owned: true };
}

async function connectExistingChrome(
  userDataDir: string,
  proc: ChildProcess | null,
  timeoutMs: number,
): Promise<ChromeSession | null> {
  if (!chromeProfileLooksRunning(userDataDir)) return null;
  try {
    const port = await readDevtoolsPort(userDataDir, timeoutMs);
    return await connectOwned(port, proc, userDataDir);
  } catch {
    return null;
  }
}

async function ensureSession(): Promise<ChromeSession> {
  if (session?.browser.isConnected()) {
    return session;
  }
  const previousProc = session?.proc ?? null;
  const previousPid = session?.chromePid ?? null;
  session = null;

  if (config.submitCdpUrl) {
    const browser = await connectCdp(config.submitCdpUrl);
    session = { browser, proc: null, chromePid: null, userDataDir: chromeUserDataDir(), owned: false };
    return session;
  }

  const userDataDir = chromeUserDataDir();
  const reused = await connectExistingChrome(userDataDir, previousProc, 8_000);
  if (reused) {
    session = {
      ...reused,
      proc: reused.proc ?? previousProc,
      chromePid: reused.chromePid ?? previousPid,
    };
    return session;
  }

  if (previousProc && previousProc.exitCode == null && !previousProc.killed) {
    const retry = await connectExistingChrome(userDataDir, previousProc, 8_000);
    if (retry) {
      session = retry;
      return session;
    }
  }

  if (chromeProfileLooksRunning(userDataDir)) {
    const late = await connectExistingChrome(userDataDir, previousProc, 12_000);
    if (late) {
      session = late;
      return session;
    }
    throw new Error(
      "Submit Chrome is already running but the debugger port did not come back. Leave that window open and retry — do not launch a second Chrome.",
    );
  }

  const proc = await launchChromeProcess(userDataDir);
  try {
    const port = await readDevtoolsPort(userDataDir, 20_000);
    session = await connectOwned(port, proc, userDataDir);
    return session;
  } catch (err) {
    proc?.kill("SIGTERM");
    throw err;
  }
}

export async function closeSubmitChrome(): Promise<void> {
  const current = session;
  session = null;
  userRestoredSubmitWindow = false;
  didMinimizeSubmitWindow = false;
  if (!current) return;
  await current.browser.close().catch(() => undefined);
  current.proc?.kill("SIGTERM");
  if (!current.proc && current.chromePid) {
    try {
      process.kill(current.chromePid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
}

export async function withSubmitPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const current = await ensureSession();
  const context = current.browser.contexts()[0] ?? (await current.browser.newContext());
  await attachAutomationHides(context);
  const openPages = context.pages().filter((p) => !p.isClosed());
  let page: Page;
  if (userRestoredSubmitWindow) {
    page = await context.newPage();
  } else if (openPages.length > 0) {
    page = openPages[openPages.length - 1]!;
    await markRestoredIfUserOpened(page);
    if (userRestoredSubmitWindow) {
      page = await context.newPage();
    }
  } else {
    page = await context.newPage();
    await minimizeSubmitWindowOnce(page);
  }
  page.setDefaultTimeout(60_000);
  let flagged = false;
  try {
    const result = await fn(page);
    if (result && typeof result === "object" && "ok" in result) {
      const rec = result as { ok?: boolean; error?: string };
      if (rec.ok === false && /possible spam/i.test(rec.error ?? "")) flagged = true;
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/possible spam/i.test(message)) flagged = true;
    throw err;
  } finally {
    const body = await page.locator("body").innerText().catch(() => "");
    if (/possible spam/i.test(body)) flagged = true;
    await markRestoredIfUserOpened(page);
    if (flagged) {
      await closeSubmitChrome();
    } else if (!userRestoredSubmitWindow) {
      await page.close().catch(() => undefined);
      const leftover = context.pages().filter((p) => !p.isClosed());
      if (leftover.length === 0) didMinimizeSubmitWindow = false;
    }
  }
}

export async function dwellBeforeSubmit(openedAt: number): Promise<void> {
  const wait = config.submitMinDwellMs - (Date.now() - openedAt);
  if (wait > 0) await sleep(wait);
}

export async function browseLikePerson(page: Page): Promise<void> {
  await sleep(800 + Math.floor(Math.random() * 900));
  const height = Number(await page.evaluate("document.body ? document.body.scrollHeight : 1200").catch(() => 1200));
  const steps = 3 + Math.floor(Math.random() * 3);
  for (let i = 1; i <= steps; i++) {
    await page.mouse.wheel(0, Math.round(height / (steps + 1))).catch(() => undefined);
    await sleep(400 + Math.floor(Math.random() * 500));
  }
  await page.mouse.move(120 + Math.random() * 400, 160 + Math.random() * 240, { steps: 12 }).catch(() => undefined);
}

export async function clickLikePerson(page: Page, box: { x: number; y: number; width: number; height: number }): Promise<void> {
  const x = box.x + box.width * (0.35 + Math.random() * 0.3);
  const y = box.y + box.height * (0.4 + Math.random() * 0.25);
  await page.mouse.move(x, y, { steps: 16 + Math.floor(Math.random() * 10) });
  await sleep(180 + Math.floor(Math.random() * 220));
  await page.mouse.down();
  await sleep(60 + Math.floor(Math.random() * 80));
  await page.mouse.up();
}
