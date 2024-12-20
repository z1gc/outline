import { version } from "../../package.json";

export async function getVersionInfo(currentVersion: string): Promise<{
  latestVersion: string;
  versionsBehind: number;
}> {
  return {
    latestVersion: currentVersion,
    versionsBehind: -1, // Return -1 if current version is not found
  };
}

export function getVersion(): string {
  return version;
}
