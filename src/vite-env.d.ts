/// <reference types="vite/client" />

interface DusDesktop {
  platform: string;
  versions: {
    electron?: string;
    chrome?: string;
    node?: string;
  };
}

interface Window {
  dusDesktop?: DusDesktop;
}
