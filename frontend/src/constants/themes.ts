import type { Icon } from '@phosphor-icons/react/lib';
import { Tree } from '@phosphor-icons/react/Tree';
import { Sun } from '@phosphor-icons/react/Sun';
import { Moon } from '@phosphor-icons/react/Moon';

export interface ThemeOption {
  id: string;
  label: string;
  Icon: Icon;
}

/** UI theme options for Nature, Sun, Moon. */
export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'nature', label: 'NATURE', Icon: Tree },
  { id: 'sun', label: 'SUN', Icon: Sun },
  { id: 'moon', label: 'MOON', Icon: Moon },
];

export function getThemeOption(themeId: string | undefined): ThemeOption {
  return THEME_OPTIONS.find((t) => t.id === themeId) ?? THEME_OPTIONS[0];
}
