import { create } from 'zustand';

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
}

interface IDEState {
  // File system
  files: FileNode[];
  openTabs: OpenTab[];
  activeTab: string | null;

  // Actions
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  setActiveTab: (path: string) => void;
  createFile: (path: string, content?: string) => void;
  deleteFile: (path: string) => void;

  // Voice state
  isListening: boolean;
  setListening: (v: boolean) => void;
  voiceTranscript: string;
  setVoiceTranscript: (v: string) => void;

  // UI state
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  terminalVisible: boolean;
  toggleTerminal: () => void;
}

// Seed with a welcome file
const initialFiles: FileNode[] = [
  {
    path: '/',
    name: 'root',
    type: 'folder',
    children: [
      {
        path: '/src',
        name: 'src',
        type: 'folder',
        children: [
          {
            path: '/src/index.tsx',
            name: 'index.tsx',
            type: 'file',
            content: `// Welcome to Derycode Voice IDE
// Press the mic button or say "start listening" to begin

console.log("Hello, Derycode!");

function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export default greet;
`,
          },
          {
            path: '/src/utils.ts',
            name: 'utils.ts',
            type: 'file',
            content: `export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
`,
          },
        ],
      },
      {
        path: '/README.md',
        name: 'README.md',
        type: 'file',
        content: '# My Project\n\nBuilt with Derycode Voice IDE.\n',
      },
    ],
  },
];

export const useIDEStore = create<IDEState>((set, get) => ({
  files: initialFiles,
  openTabs: [],
  activeTab: null,

  openFile: (path) => {
    const state = get();
    const file = findFile(state.files, path);
    if (!file || file.type !== 'file') return;

    if (state.openTabs.some((t) => t.path === path)) {
      set({ activeTab: path });
      return;
    }

    set({
      openTabs: [...state.openTabs, {
        path,
        name: file.name,
        content: file.content || '',
        dirty: false,
      }],
      activeTab: path,
    });
  },

  closeTab: (path) => {
    const state = get();
    const newTabs = state.openTabs.filter((t) => t.path !== path);
    const newActive = state.activeTab === path
      ? (newTabs[newTabs.length - 1]?.path ?? null)
      : state.activeTab;
    set({ openTabs: newTabs, activeTab: newActive });
  },

  updateFileContent: (path, content) => {
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.path === path ? { ...t, content, dirty: true } : t
      ),
    }));
  },

  setActiveTab: (path) => set({ activeTab: path }),

  createFile: (path, content = '') => {
    set((state) => {
      const newFile: FileNode = { path, name: path.split('/').pop() || 'untitled', type: 'file', content };
      return {
        files: addToTree(state.files, newFile),
        openTabs: [...state.openTabs, { path, name: newFile.name, content, dirty: false }],
        activeTab: path,
      };
    });
  },

  deleteFile: (path) => {
    set((state) => ({
      files: removeFromTree(state.files, path),
      openTabs: state.openTabs.filter((t) => t.path !== path),
      activeTab: state.activeTab === path ? null : state.activeTab,
    }));
  },

  // Voice
  isListening: false,
  setListening: (v) => set({ isListening: v }),
  voiceTranscript: '',
  setVoiceTranscript: (v) => set({ voiceTranscript: v }),

  // UI
  sidebarVisible: true,
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  terminalVisible: false,
  toggleTerminal: () => set((s) => ({ terminalVisible: !s.terminalVisible })),
}));

// Helpers
function findFile(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findFile(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function addToTree(nodes: FileNode[], file: FileNode): FileNode[] {
  // Simple: add to root folder's children
  const root = nodes[0];
  if (root && root.children) {
    root.children.push(file);
  }
  return [...nodes];
}

function removeFromTree(nodes: FileNode[], path: string): FileNode[] {
  return nodes
    .filter((n) => n.path !== path)
    .map((n) => ({
      ...n,
      children: n.children ? removeFromTree(n.children, path) : undefined,
    }));
}
