import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { AppDistribution, AppVersionInfo, APP_VERSION } from '../types';

const GITHUB_RELEASES_API = 'https://api.github.com/repos/Krrish1411/KhataGHAR/releases';
const FALLBACK_VERSION_URL = 'https://raw.githubusercontent.com/Krrish1411/KhataGHAR/main/public/version.json';
const LOCAL_VERSION_URL = './version.json';
const LAST_CHECK_KEY = 'khataghar_last_update_check';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Hours

/**
 * Detect runtime platform and distribution package format.
 */
export async function detectDistribution(): Promise<AppDistribution> {
  if (Capacitor.isNativePlatform()) return 'android';

  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI.getStorageInfo) {
        const info = await electronAPI.getStorageInfo();
        if (info?.platform === 'win32') {
          return info.isPortable ? 'windows-portable' : 'windows-setup';
        }
        if (info?.platform === 'linux') {
          return info.isAppImage ? 'linux-appimage' : 'linux-deb';
        }
        if (info?.platform === 'darwin') {
          return 'mac';
        }
      }
    } catch {}

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows-setup';
    if (ua.includes('linux')) return 'linux-appimage';
    if (ua.includes('mac')) return 'mac';
  }

  // Check userAgent on web browsers as hint for download preference
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
  }

  return 'web';
}

interface ParsedSemVer {
  major: number;
  minor: number;
  patch: number;
  prereleaseType: string;
  prereleaseNum: number;
}

export function parseSemVer(v: string): ParsedSemVer {
  const clean = (v || '').trim().replace(/^v/i, '');
  const [corePart, prePart] = clean.split('-');
  const coreNums = (corePart || '').split('.').map((n) => parseInt(n, 10) || 0);

  let prereleaseType = 'stable';
  let prereleaseNum = 0;

  if (prePart) {
    const match = prePart.match(/^([a-zA-Z]+)(?:\.?(\d+))?/);
    if (match) {
      prereleaseType = match[1].toLowerCase();
      prereleaseNum = match[2] ? parseInt(match[2], 10) : 0;
    } else {
      prereleaseType = prePart.toLowerCase();
    }
  }

  return {
    major: coreNums[0] || 0,
    minor: coreNums[1] || 0,
    patch: coreNums[2] || 0,
    prereleaseType,
    prereleaseNum,
  };
}

/**
 * Returns true if remote version is strictly newer than current version.
 * Fully supports SemVer 2.0.0 pre-releases (e.g. 1.0.0-beta.2 > 1.0.0-beta.1, 1.0.0 > 1.0.0-beta.1).
 */
export function isNewerVersion(remote: string, current: string): boolean {
  if (!remote || !current) return false;
  if (remote.trim() === current.trim()) return false;

  const r = parseSemVer(remote);
  const c = parseSemVer(current);

  if (r.major !== c.major) return r.major > c.major;
  if (r.minor !== c.minor) return r.minor > c.minor;
  if (r.patch !== c.patch) return r.patch > c.patch;

  // If major.minor.patch core versions match:
  if (r.prereleaseType === 'stable' && c.prereleaseType !== 'stable') return true;
  if (r.prereleaseType !== 'stable' && c.prereleaseType === 'stable') return false;

  const rank: Record<string, number> = { alpha: 1, beta: 2, rc: 3 };
  const rRank = rank[r.prereleaseType] || 0;
  const cRank = rank[c.prereleaseType] || 0;

  if (rRank !== cRank) return rRank > cRank;

  return r.prereleaseNum > c.prereleaseNum;
}

/**
 * Safe fetcher that avoids CORS preflight traps on GitHub raw/API.
 * Uses CapacitorHttp on native mobile to bypass WebView CORS entirely.
 * Uses standard fetch with query cache-busting and zero custom headers on Web/Electron.
 */
async function safeFetchJson<T>(url: string, timeoutMs: number = 8000): Promise<T | null> {
  const ts = Date.now();
  const cacheBustUrl = url.includes('?') ? `${url}&_t=${ts}` : `${url}?_t=${ts}`;

  if (Capacitor.isNativePlatform()) {
    try {
      const response = await CapacitorHttp.get({
        url: cacheBustUrl,
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
      });
      if (response.status === 200 && response.data) {
        return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      }
    } catch {}
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(cacheBustUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Graceful fallback
  } finally {
    clearTimeout(timer);
  }

  return null;
}

/**
 * Parse changelog bullet points from GitHub release markdown body.
 */
function parseChangelog(body?: string): string[] {
  if (!body) return ['Performance improvements and cross-platform reliability updates.'];
  const lines = body.split('\n');
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      bullets.push(trimmed.substring(2).trim());
    } else if (trimmed.startsWith('• ')) {
      bullets.push(trimmed.substring(2).trim());
    }
    if (bullets.length >= 5) break;
  }
  return bullets.length > 0
    ? bullets
    : ['Institutional financial ledger stability enhancements, bug fixes, and performance optimizations.'];
}

/**
 * Query GitHub Releases API to retrieve release information, including pre-releases (beta/alpha).
 */
export async function fetchRemoteVersionInfo(): Promise<AppVersionInfo> {
  // 1. Primary: GitHub Releases API (includes full asset URLs & pre-releases)
  try {
    const releases = await safeFetchJson<any[]>(GITHUB_RELEASES_API, 8000);
    if (Array.isArray(releases) && releases.length > 0) {
      // Sort releases by semver descending
      const sorted = [...releases].sort((a, b) => {
        const vA = a.tag_name || a.name || '';
        const vB = b.tag_name || b.name || '';
        return isNewerVersion(vA, vB) ? -1 : 1;
      });

      const topRelease = sorted[0];
      const tag = (topRelease.tag_name || topRelease.name || '1.0.0-beta.1').replace(/^v/, '');

      const downloads: AppVersionInfo['downloads'] = {};
      for (const asset of topRelease.assets || []) {
        const name = (asset.name || '').toLowerCase();
        const url = asset.browser_download_url;
        if (name.endsWith('.apk')) {
          downloads.android = url;
        } else if (name.includes('portable')) {
          downloads.windowsPortable = url;
        } else if (name.endsWith('.exe')) {
          downloads.windows = url;
        } else if (name.endsWith('.appimage')) {
          downloads.linux = url;
        } else if (name.endsWith('.deb')) {
          downloads.linuxDeb = url;
        } else if (name.endsWith('.tar.gz')) {
          downloads.linuxTar = url;
        } else if (name.endsWith('.dmg')) {
          downloads.mac = url;
        } else if (name.endsWith('.zip') && (name.includes('mac') || name.includes('darwin'))) {
          downloads.macZip = url;
        } else if (name.endsWith('.zip')) {
          downloads.webZip = url;
        }
      }

      return {
        version: tag,
        tagName: topRelease.tag_name || `v${tag}`,
        releaseDate: (topRelease.published_at || topRelease.created_at || new Date().toISOString()).split('T')[0],
        isPrerelease: Boolean(topRelease.prerelease),
        htmlUrl: topRelease.html_url || `https://github.com/Krrish1411/KhataGHAR/releases/tag/${topRelease.tag_name}`,
        changelog: parseChangelog(topRelease.body),
        downloads,
      };
    }
  } catch {}

  // 2. Fallback: Query version.json from raw repository or local public
  try {
    const fallback =
      (await safeFetchJson<any>(FALLBACK_VERSION_URL, 6000)) ||
      (await safeFetchJson<any>(LOCAL_VERSION_URL, 4000));
    if (fallback && fallback.version) {
      return {
        version: fallback.version.replace(/^v/, ''),
        tagName: fallback.tagName || `v${fallback.version.replace(/^v/, '')}`,
        releaseDate: fallback.releaseDate || new Date().toISOString().split('T')[0],
        isPrerelease: fallback.version.includes('-'),
        htmlUrl:
          fallback.htmlUrl ||
          `https://github.com/Krrish1411/KhataGHAR/releases/tag/v${fallback.version.replace(/^v/, '')}`,
        changelog: Array.isArray(fallback.changelog) ? fallback.changelog : [fallback.changelog || 'Stability update'],
        downloads: fallback.downloads || {},
      };
    }
  } catch {}

  // 3. Graceful default if completely offline or rate limited (never throws)
  return {
    version: APP_VERSION,
    tagName: `v${APP_VERSION}`,
    releaseDate: new Date().toISOString().split('T')[0],
    isPrerelease: APP_VERSION.includes('-'),
    htmlUrl: 'https://github.com/Krrish1411/KhataGHAR/releases',
    changelog: ['Institutional release with high-security zero-cloud encrypted ledger.'],
    downloads: {},
  };
}

/**
 * Silent daily background update checker.
 * Executes at most once every 24 hours on launch.
 * Returns AppVersionInfo if a newer version is discovered, or null if up-to-date / offline.
 */
export async function checkDailyUpdate(currentVersion: string = APP_VERSION): Promise<AppVersionInfo | null> {
  try {
    const lastCheckStr = typeof window !== 'undefined' ? localStorage.getItem(LAST_CHECK_KEY) : null;
    const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;
    const now = Date.now();

    // Check at most once every 24 hours
    if (now - lastCheck < CHECK_INTERVAL_MS) {
      return null;
    }

    const data = await fetchRemoteVersionInfo();
    localStorage.setItem(LAST_CHECK_KEY, String(now));

    if (data?.version && isNewerVersion(data.version, currentVersion)) {
      return data;
    }
    return null;
  } catch {
    // Silent fail for background check
    return null;
  }
}
