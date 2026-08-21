import { create } from 'zustand';
import { fileSystem, FileEntry } from '@/lib/fileSystem';

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
  language: string;
}

export type ThemeName = 'dark' | 'light' | 'midnight' | 'solarized';

export interface TerminalLine {
  text: string;
  type: 'command' | 'output' | 'error' | 'info';
}

export interface OutputLine {
  text: string;
  type: 'output' | 'error' | 'info' | 'success';
}

export type MobilePanel = 'editor' | 'files' | 'terminal' | 'output' | 'settings';

interface IDEState {
  // Files
  files: FileEntry[];
  openTabs: OpenTab[];
  activeTab: string | null;
  expandedFolders: Set<string>;

  // Actions: files
  loadFiles: () => Promise<void>;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  setActiveTab: (path: string) => void;
  createFile: (path: string, content?: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  saveFile: (path: string) => Promise<void>;
  toggleFolder: (path: string) => void;

  // Voice
  isListening: boolean;
  setListening: (v: boolean) => void;
  voiceTranscript: string;
  setVoiceTranscript: (v: string) => void;
  voiceFeedback: string;
  setVoiceFeedback: (v: string) => void;

  // UI
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  setSidebarVisible: (v: boolean) => void;
  terminalVisible: boolean;
  toggleTerminal: () => void;
  setTerminalVisible: (v: boolean) => void;
  outputVisible: boolean;
  toggleOutput: () => void;
  setOutputVisible: (v: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  minimapVisible: boolean;
  toggleMinimap: () => void;
  fontSize: number;
  setFontSize: (n: number) => void;

  // Mobile
  mobilePanel: MobilePanel;
  setMobilePanel: (p: MobilePanel) => void;

  // Theme
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;

  // Terminal
  terminalLines: TerminalLine[];
  addTerminalLine: (line: TerminalLine) => void;
  clearTerminal: () => void;

  // Code Runner / Output
  outputLines: OutputLine[];
  addOutputLine: (line: OutputLine) => void;
  clearOutput: () => void;
  isRunning: boolean;
  setRunning: (v: boolean) => void;
  runStatus: string;
  setRunStatus: (s: string) => void;
  htmlPreview: string | null;
  setHtmlPreview: (html: string | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', md: 'markdown', css: 'css', html: 'html', xml: 'xml',
    py: 'python', go: 'go', rs: 'rust', java: 'java', cpp: 'cpp', c: 'c',
    sh: 'shell', yml: 'yaml', yaml: 'yaml', toml: 'toml', sql: 'sql',
    graphql: 'graphql', vue: 'html', svelte: 'html', php: 'php', rb: 'ruby',
    swift: 'swift', kt: 'kotlin', dart: 'dart', lua: 'lua', r: 'r',
    txt: 'plaintext', env: 'plaintext', dockerfile: 'dockerfile',
  };
  return map[ext] || 'plaintext';
}

/** Map Monaco language to code runner language */
export function getRunnerLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    py: 'python', html: 'html', css: 'css', json: 'json',
  };
  return map[ext] || '';
}

export const useIDEStore = create<IDEState>((set, get) => ({
  files: [],
  openTabs: [],
  activeTab: null,
  expandedFolders: new Set(['/']),

  loadFiles: async () => {
    await fileSystem.seedSampleProject();
    const files = await fileSystem.getAll();
    set({ files });
  },

  openFile: (path) => {
    const state = get();
    const file = state.files.find(f => f.path === path);
    if (!file || file.type !== 'file') return;

    if (state.openTabs.some(t => t.path === path)) {
      set({ activeTab: path });
      return;
    }

    set({
      openTabs: [...state.openTabs, {
        path,
        name: file.name,
        content: file.content || '',
        dirty: false,
        language: getLanguage(file.name),
      }],
      activeTab: path,
    });
  },

  closeTab: (path) => {
    const state = get();
    const newTabs = state.openTabs.filter(t => t.path !== path);
    const newActive = state.activeTab === path
      ? (newTabs[newTabs.length - 1]?.path ?? null)
      : state.activeTab;
    set({ openTabs: newTabs, activeTab: newActive });
  },

  updateFileContent: (path, content) => {
    set(state => ({
      openTabs: state.openTabs.map(t =>
        t.path === path ? { ...t, content, dirty: true } : t
      ),
    }));
  },

  setActiveTab: (path) => set({ activeTab: path }),

  createFile: async (path, content = '') => {
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
    const name = path.split('/').pop() || 'untitled';
    await fileSystem.create({
      path, name, type: 'file', content,
      parentId: parentPath,
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    const files = await fileSystem.getAll();
    set(state => ({
      files,
      openTabs: [...state.openTabs, { path, name, content, dirty: false, language: getLanguage(name) }],
      activeTab: path,
    }));
  },

  createFolder: async (path) => {
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
    const name = path.split('/').pop() || 'folder';
    await fileSystem.create({
      path, name, type: 'folder',
      parentId: parentPath,
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    const files = await fileSystem.getAll();
    set({ files });
  },

  deleteFile: async (path) => {
    await fileSystem.delete(path);
    const files = await fileSystem.getAll();
    set(state => ({
      files,
      openTabs: state.openTabs.filter(t => t.path !== path),
      activeTab: state.activeTab === path ? null : state.activeTab,
    }));
  },

  renameFile: async (oldPath, newPath) => {
    await fileSystem.rename(oldPath, newPath);
    const files = await fileSystem.getAll();
    const state = get();
    const name = newPath.split('/').pop() || 'untitled';
    set({
      files,
      openTabs: state.openTabs.map(t =>
        t.path === oldPath
          ? { ...t, path: newPath, name, language: getLanguage(name) }
          : t
      ),
      activeTab: state.activeTab === oldPath ? newPath : state.activeTab,
    });
  },

  saveFile: async (path) => {
    const state = get();
    const tab = state.openTabs.find(t => t.path === path);
    if (!tab) return;
    await fileSystem.update(path, { content: tab.content });
    set(state => ({
      openTabs: state.openTabs.map(t => t.path === path ? { ...t, dirty: false } : t),
    }));
  },

  toggleFolder: (path) => {
    set(state => {
      const expanded = new Set(state.expandedFolders);
      if (expanded.has(path)) expanded.delete(path);
      else expanded.add(path);
      return { expandedFolders: expanded };
    });
  },

  // Voice
  isListening: false,
  setListening: (v) => set({ isListening: v }),
  voiceTranscript: '',
  setVoiceTranscript: (v) => set({ voiceTranscript: v }),
  voiceFeedback: '',
  setVoiceFeedback: (v) => set({ voiceFeedback: v }),

  // UI
  sidebarVisible: true,
  toggleSidebar: () => set(s => ({ sidebarVisible: !s.sidebarVisible })),
  setSidebarVisible: (v) => set({ sidebarVisible: v }),
  terminalVisible: false,
  toggleTerminal: () => set(s => ({ terminalVisible: !s.terminalVisible })),
  setTerminalVisible: (v) => set({ terminalVisible: v }),
  outputVisible: false,
  toggleOutput: () => set(s => ({ outputVisible: !s.outputVisible })),
  setOutputVisible: (v) => set({ outputVisible: v }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  minimapVisible: false,
  toggleMinimap: () => set(s => ({ minimapVisible: !s.minimapVisible })),
  fontSize: 14,
  setFontSize: (n) => set({ fontSize: n }),

  // Mobile
  mobilePanel: 'editor',
  setMobilePanel: (p) => set({ mobilePanel: p }),

  // Theme
  theme: 'dark',
  setTheme: (t) => {
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
    fileSystem.setSetting('theme', t);
  },

  // Terminal
  terminalLines: [{ text: 'Derycode Voice IDE Terminal v0.2.0', type: 'info' as const }],
  addTerminalLine: (line) => set(state => ({ terminalLines: [...state.terminalLines, line] })),
  clearTerminal: () => set({ terminalLines: [] }),

  // Code Runner / Output
  outputLines: [],
  addOutputLine: (line) => set(state => ({ outputLines: [...state.outputLines, line] })),
  clearOutput: () => set({ outputLines: [], htmlPreview: null }),
  isRunning: false,
  setRunning: (v) => set({ isRunning: v }),
  runStatus: '',
  setRunStatus: (s) => set({ runStatus: s }),
  htmlPreview: null,
  setHtmlPreview: (html) => set({ htmlPreview: html }),

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
