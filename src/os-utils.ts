/*
 * See https://github.com/fwcd/vscode-kotlin/blob/master/src/util/osUtils.ts
 */

export function isWindows(): boolean {
  return process.platform === "win32";
}

const UNIXOIDS = new Set([
  "linux",
  "darwin",
  "freebsd",
  "openbsd"
]);

export function isUnixoid(): boolean {
  return process.platform in UNIXOIDS;
}

export function correctBinName(binName: string): string {
  return `${binName}${isWindows() ? '.exe' : ''}`;
}

export function correctScriptName(binName: string): string {
  return `${binName}${isWindows() ? '.bat' : ''}`;
}
