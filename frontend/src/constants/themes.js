import { Tree, Sun, Moon } from '@phosphor-icons/react';

/** UI theme options for Nature, Sun, Moon. */
export const THEME_OPTIONS = [
  { id: 'nature', label: 'NATURE', Icon: Tree },
  { id: 'sun', label: 'SUN', Icon: Sun },
  { id: 'moon', label: 'MOON', Icon: Moon },
];

export const getThemeOption = (themeId) =>
  THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0];
