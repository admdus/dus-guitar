/// <reference types="vite/client" />

interface DusDesktop {
  platform: string;
  versions: {
    electron?: string;
    chrome?: string;
    node?: string;
  };
  requestMicrophoneAccess?: () => Promise<boolean>;
}

interface Window {
  dusDesktop?: DusDesktop;
}
