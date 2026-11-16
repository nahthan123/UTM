/**
 * TIME AND FORMATTING UTILITIES
 */

export function formatUtcTime(isoString?: string): string {
  if (!isoString) return '--:--:-- UTC';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--:-- UTC';
    return d.toISOString().substring(11, 19) + ' UTC';
  } catch {
    return '--:--:-- UTC';
  }
}

export function formatFullUtcDateTime(isoString?: string): string {
  if (!isoString) return '---';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '---';
    return d.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
  } catch {
    return '---';
  }
}

export function formatDurationSeconds(seconds: number): string {
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = Math.floor(abs % 60);
  const sign = seconds < 0 ? '-' : '+';
  return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getElapsedTimeMs(fromIsoString: string, toIsoString: string = new Date().toISOString()): number {
  try {
    const tFrom = new Date(fromIsoString).getTime();
    const tTo = new Date(toIsoString).getTime();
    return Math.max(0, tTo - tFrom);
  } catch {
    return 0;
  }
}
