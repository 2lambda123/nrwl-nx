import { getGraphService } from './machines/graph.service';
import {getEnvironmentConfig, useEnvironmentConfig} from "./hooks/use-environment-config";

const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
const htmlEl = document.documentElement;
const localStorageThemeKey = 'nx-dep-graph-theme';
export type Theme = 'light' | 'dark' | 'system';
export let currentTheme: Theme;

function mediaListener(ev: MediaQueryListEvent) {
  const environment = getEnvironmentConfig();

  if(!environment.appConfig.showExperimentalFeatures) {
    currentTheme = 'light';
    htmlEl.className = 'light';
    return;
  }

  const resolver = ev.matches ? 'dark' : 'light';
  htmlEl.className = resolver;
  currentTheme = resolver;
}

export function themeInit() {
  const theme = localStorage.getItem(localStorageThemeKey) as Theme ?? 'system';
  themeResolver(theme);
}

export function themeResolver(theme: Theme) {
  const environment = getEnvironmentConfig();

  if(!environment.appConfig.showExperimentalFeatures) {
    htmlEl.className = 'light';
    currentTheme = 'light';
    return;
  }

  if (theme !== 'system') {
    darkMedia.removeEventListener('change', mediaListener);
    htmlEl.className = theme;
    currentTheme = theme;
  } else {
    const resolver = darkMedia.matches ? 'dark' : 'light';

    darkMedia.addEventListener('change', mediaListener);
    htmlEl.className = resolver;
    currentTheme = resolver;
  }

  localStorage.setItem(localStorageThemeKey, theme);
  getGraphService().evaluateStyles();
}

export function selectDynamically<T>(
  darkModeSetting: T,
  lightModeSetting: T
): () => T {
  return () => selectStatically(darkModeSetting, lightModeSetting);
}

// The function exists because some places do not support selectDynamically
// It also prevents the dynamic change of theme for certain elements like tippy
export function selectStatically<T>(
  darkModeSetting: T,
  lightModeSetting: T
): T {
  return currentTheme === 'dark' ? darkModeSetting : lightModeSetting;
}
