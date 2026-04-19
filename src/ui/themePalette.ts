import type { CSSProperties } from 'react';

export type ThemeValue = 'light' | 'dark' | 'mid' | undefined;

interface ThemePalette {
  card: CSSProperties;
  inner: CSSProperties;         // YOU SEND / YOU RECEIVE sections
  input: CSSProperties;         // amount number inputs
  tokenBtn: CSSProperties;      // TokenSelect trigger button
  dropdown: CSSProperties;      // TokenSelect dropdown container
  searchInput: CSSProperties;   // TokenSelect search input
  invertBtn: CSSProperties;     // ⇅ invert button
  quoteSection: CSSProperties;  // quote/route details container
  tabBar: CSSProperties;        // tabs container
  activeTab: CSSProperties;     // active tab button
}

// Mid = Middle Staking design: deep purple dark gradient on dark base
const MID: ThemePalette = {
  card: {
    background:
      'linear-gradient(0deg, rgba(99,74,203,0.32), rgba(99,74,203,0.32)), ' +
      'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%), ' +
      '#0a0614',
    borderColor: '#695885',
    color: '#ffffff',
  },
  inner: {
    backgroundColor: 'rgba(13,8,28,0.75)',
    borderColor: '#695885',
  },
  input: {
    backgroundColor: 'rgba(8,4,18,0.9)',
    color: '#ffffff',
    borderColor: '#695885',
  },
  tokenBtn: {
    backgroundColor: 'rgba(8,4,18,0.9)',
    color: '#ffffff',
    borderColor: '#695885',
  },
  dropdown: {
    backgroundColor: '#0d0820',
    borderColor: '#695885',
  },
  searchInput: {
    backgroundColor: 'rgba(5,2,14,0.95)',
    color: '#ffffff',
    borderColor: '#695885',
  },
  invertBtn: {
    backgroundColor: 'rgba(8,4,18,0.9)',
    borderColor: '#695885',
  },
  quoteSection: {
    backgroundColor: 'rgba(13,8,28,0.75)',
    borderColor: '#695885',
  },
  tabBar: {
    backgroundColor: 'rgba(13,8,28,0.6)',
  },
  activeTab: {
    background: 'linear-gradient(135deg, rgba(189,55,236,0.3), rgba(31,103,255,0.3))',
    color: '#BD37EC',
  },
};

const DARK: ThemePalette = {
  card: { backgroundColor: '#111', color: '#ffffff' },
  inner: { backgroundColor: '#1e1e1e', borderColor: '#333' },
  input: { backgroundColor: '#2a2a2a', color: '#ffffff', borderColor: '#444' },
  tokenBtn: { backgroundColor: '#2a2a2a', color: '#ffffff', borderColor: '#444' },
  dropdown: { backgroundColor: '#2a2a2a', borderColor: '#444' },
  searchInput: { backgroundColor: '#1e1e1e', color: '#ffffff', borderColor: '#555' },
  invertBtn: { backgroundColor: '#2a2a2a', borderColor: '#444' },
  quoteSection: { backgroundColor: '#1a1a1a', borderColor: '#333' },
  tabBar: { backgroundColor: '#1a1a1a' },
  activeTab: { backgroundColor: '#2a2a2a', color: '#f59e0b' },
};

const LIGHT: ThemePalette = {
  card: { backgroundColor: '#ffffff', color: '#111111' },
  inner: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  input: { backgroundColor: '#ffffff', color: '#111111', borderColor: '#e5e7eb' },
  tokenBtn: { backgroundColor: '#ffffff', color: '#111111', borderColor: '#e5e7eb' },
  dropdown: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  searchInput: { backgroundColor: '#f9fafb', color: '#111111', borderColor: '#e5e7eb' },
  invertBtn: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  quoteSection: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  tabBar: { backgroundColor: '#f3f4f6' },
  activeTab: { backgroundColor: '#ffffff', color: '#f59e0b' },
};

const NONE: ThemePalette = {
  card: {}, inner: {}, input: {}, tokenBtn: {}, dropdown: {},
  searchInput: {}, invertBtn: {}, quoteSection: {}, tabBar: {}, activeTab: {},
};

export function getThemePalette(theme: ThemeValue): ThemePalette {
  if (theme === 'mid') return MID;
  if (theme === 'dark') return DARK;
  if (theme === 'light') return LIGHT;
  return NONE; // undefined: rely on CSS cascade
}
