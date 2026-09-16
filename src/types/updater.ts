export const APP_VERSION = '1.0.0-beta.1';
export const APP_CHANNEL = 'Beta Preview';

export type AppDistribution =
  | 'windows-setup'
  | 'windows-portable'
  | 'linux-appimage'
  | 'linux-deb'
  | 'linux-tar'
  | 'mac'
  | 'android'
  | 'web';

export interface AppVersionInfo {
  version: string;
  tagName: string;
  releaseDate: string;
  isPrerelease: boolean;
  htmlUrl: string;
  changelog: string[];
  downloads: {
    windows?: string;
    windowsPortable?: string;
    linux?: string;
    linuxDeb?: string;
    linuxTar?: string;
    mac?: string;
    macZip?: string;
    android?: string;
    webZip?: string;
  };
}
