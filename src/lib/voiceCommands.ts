import { useIDEStore } from '@/hooks/useIDEStore';
import { fileSystem } from '@/lib/fileSystem';

export interface VoiceCommand {
  patterns: RegExp[];
  description: string;
  execute: (match: RegExpMatchArray, transcript: string) => void;
}

function speak(text: string) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);
  }
  useIDEStore.getState().setVoiceFeedback(text);
}

function findFileByName(nodes: any[], name: string): any | null {
  const lower = name.toLowerCase();
  for (const n of nodes) {
    if (n.type === 'file' && (n.name.toLowerCase() === lower || n.path.toLowerCase().includes(lower))) return n;
    if (n.children) {
      const found = findFileByName(n.children, name);
      if (found) return found;
    }
  }
  return null;
}

export const voiceCommands: VoiceCommand[] = [
  // File operations
  {
    patterns: [/^open\s+(?:file\s+)?(.+)/i, /^show\s+(?:file\s+)?(.+)/i],
    description: 'Open a file by name',
    execute: (match) => {
      const name = match[1].trim();
      const state = useIDEStore.getState();
      const file = state.files.find(f => f.type === 'file' && (f.name === name || f.path === name || f.path.endsWith('/' + name)));
      if (file) {
        state.openFile(file.path);
        speak(`Opened ${file.name}`);
      } else {
        speak(`File ${name} not found`);
      }
    },
  },
  {
    patterns: [/^close\s+(?:tab|file)(?:\s+(.+))?/i],
    description: 'Close active or named tab',
    execute: (match) => {
      const state = useIDEStore.getState();
      if (match[1]) {
        const name = match[1].trim();
        const tab = state.openTabs.find(t => t.name === name || t.path === name);
        if (tab) {
          state.closeTab(tab.path);
          speak(`Closed ${tab.name}`);
        } else {
          speak(`Tab ${name} not open`);
        }
      } else if (state.activeTab) {
        const tab = state.openTabs.find(t => t.path === state.activeTab);
        state.closeTab(state.activeTab);
        speak(`Closed ${tab?.name || 'tab'}`);
      } else {
        speak('No active tab');
      }
    },
  },
  {
    patterns: [/^create\s+(?:new\s+)?file\s+(.+)/i, /^new\s+file\s+(.+)/i, /^make\s+file\s+(.+)/i],
    description: 'Create a new file',
    execute: (match) => {
      const name = match[1].trim();
      const path = name.startsWith('/') ? name : `/${name}`;
      useIDEStore.getState().createFile(path).then(() => speak(`Created ${name}`));
    },
  },
  {
    patterns: [/^create\s+(?:new\s+)?folder\s+(.+)/i, /^new\s+folder\s+(.+)/i, /^make\s+folder\s+(.+)/i],
    description: 'Create a new folder',
    execute: (match) => {
      const name = match[1].trim();
      const path = name.startsWith('/') ? name : `/${name}`;
      useIDEStore.getState().createFolder(path).then(() => speak(`Created folder ${name}`));
    },
  },
  {
    patterns: [/^delete\s+(?:file\s+)?(.+)/i, /^remove\s+(?:file\s+)?(.+)/i],
    description: 'Delete a file',
    execute: (match) => {
      const name = match[1].trim();
      const state = useIDEStore.getState();
      const file = state.files.find(f => f.type === 'file' && (f.name === name || f.path === name));
      if (file) {
        state.deleteFile(file.path).then(() => speak(`Deleted ${file.name}`));
      } else {
        speak(`File ${name} not found`);
      }
    },
  },
  {
    patterns: [/^save(?:\s+(?:file|this))?/i, /^save\s+changes/i],
    description: 'Save the current file',
    execute: () => {
      const state = useIDEStore.getState();
      if (state.activeTab) {
        state.saveFile(state.activeTab).then(() => speak('Saved'));
      } else {
        speak('No file to save');
      }
    },
  },
  {
    patterns: [/^rename\s+(?:file\s+)?(.+?)\s+to\s+(.+)/i],
    description: 'Rename a file',
    execute: (match) => {
      const oldName = match[1].trim();
      const newName = match[2].trim();
      const state = useIDEStore.getState();
      const file = state.files.find(f => f.type === 'file' && (f.name === oldName || f.path === oldName));
      if (file) {
        const newPath = file.path.substring(0, file.path.lastIndexOf('/')) + '/' + newName;
        state.renameFile(file.path, newPath).then(() => speak(`Renamed to ${newName}`));
      } else {
        speak(`File ${oldName} not found`);
      }
    },
  },

  // Navigation
  {
    patterns: [/^go\s+to\s+line\s+(\d+)/i, /^line\s+(\d+)/i, /^jump\s+to\s+line\s+(\d+)/i],
    description: 'Jump to a line number',
    execute: (match) => {
      const line = parseInt(match[1], 10);
      window.dispatchEvent(new CustomEvent('ide:goto-line', { detail: { line } }));
      speak(`Line ${line}`);
    },
  },
  {
    patterns: [/^go\s+to\s+(?:end|bottom)/i, /^go\s+to\s+EOF/i],
    description: 'Go to end of file',
    execute: () => {
      window.dispatchEvent(new CustomEvent('ide:goto-end'));
      speak('End of file');
    },
  },
  {
    patterns: [/^go\s+to\s+(?:top|start|beginning)/i],
    description: 'Go to beginning of file',
    execute: () => {
      window.dispatchEvent(new CustomEvent('ide:goto-top'));
      speak('Beginning of file');
    },
  },

  // UI toggles
  {
    patterns: [/^toggle\s+sidebar/i, /^show\s+sidebar/i, /^hide\s+sidebar/i],
    description: 'Toggle the sidebar',
    execute: () => {
      useIDEStore.getState().toggleSidebar();
      speak('Sidebar toggled');
    },
  },
  {
    patterns: [/^toggle\s+terminal/i, /^show\s+terminal/i, /^open\s+terminal/i, /^hide\s+terminal/i],
    description: 'Toggle the terminal',
    execute: () => {
      useIDEStore.getState().toggleTerminal();
      speak('Terminal toggled');
    },
  },
  {
    patterns: [/^toggle\s+minimap/i, /^show\s+minimap/i, /^hide\s+minimap/i],
    description: 'Toggle the minimap',
    execute: () => {
      useIDEStore.getState().toggleMinimap();
      speak('Minimap toggled');
    },
  },
  {
    patterns: [/^open\s+settings/i, /^show\s+settings/i, /^settings/i],
    description: 'Open settings panel',
    execute: () => {
      useIDEStore.getState().setSettingsOpen(true);
      speak('Settings opened');
    },
  },
  {
    patterns: [/^open\s+command\s+palette/i, /^command\s+palette/i, /^search\s+commands/i],
    description: 'Open the command palette',
    execute: () => {
      useIDEStore.getState().setCommandPaletteOpen(true);
    },
  },

  // Themes
  {
    patterns: [/^(?:set\s+)?theme\s+(dark|light|midnight|solarized)/i, /^switch\s+to\s+(dark|light|midnight|solarized)\s+theme/i],
    description: 'Change the color theme',
    execute: (match) => {
      const theme = match[1].toLowerCase() as any;
      useIDEStore.getState().setTheme(theme);
      speak(`Theme changed to ${theme}`);
    },
  },

  // Font size
  {
    patterns: [/^(?:increase|larger|bigger)\s+(?:font|text)/i, /^font\s+(?:size\s+)?up/i],
    description: 'Increase font size',
    execute: () => {
      const state = useIDEStore.getState();
      const newSize = Math.min(state.fontSize + 2, 32);
      state.setFontSize(newSize);
      speak(`Font size ${newSize}`);
    },
  },
  {
    patterns: [/^(?:decrease|smaller|small)\s+(?:font|text)/i, /^font\s+(?:size\s+)?down/i],
    description: 'Decrease font size',
    execute: () => {
      const state = useIDEStore.getState();
      const newSize = Math.max(state.fontSize - 2, 8);
      state.setFontSize(newSize);
      speak(`Font size ${newSize}`);
    },
  },

  // Terminal commands (simulated)
  {
    patterns: [/^run\s+(.+)/i, /^execute\s+(.+)/i],
    description: 'Run a command in the terminal',
    execute: (match) => {
      const cmd = match[1].trim();
      const state = useIDEStore.getState();
      state.setTerminalVisible(true);
      state.addTerminalLine({ text: `$ ${cmd}`, type: 'command' });

      // Simulated command responses
      setTimeout(() => {
        const responses: Record<string, string[]> = {
          'build': ['✓ Compiled successfully', '✓ Build complete'],
          'dev': ['▶ Starting dev server...', '▶ Ready on http://localhost:3000'],
          'test': ['✓ All tests passed (3 suites, 12 tests)'],
          'lint': ['✓ No linting errors found'],
          'start': ['▶ Server started on port 3000'],
        };

        const key = Object.keys(responses).find(k => cmd.includes(k));
        if (key) {
          responses[key].forEach(line => state.addTerminalLine({ text: line, type: 'output' }));
          speak(`Ran ${cmd}`);
        } else {
          state.addTerminalLine({ text: `Command not found: ${cmd}`, type: 'error' });
          speak(`Unknown command ${cmd}`);
        }
      }, 500);
    },
  },
  {
    patterns: [/^clear\s+terminal/i, /^clear\s+screen/i, /^cls/i],
    description: 'Clear the terminal',
    execute: () => {
      useIDEStore.getState().clearTerminal();
      speak('Terminal cleared');
    },
  },

  // Code operations
  {
    patterns: [/^format\s+(?:this\s+)?(?:file|code)/i, /^prettify/i, /^beautify/i],
    description: 'Format the current file',
    execute: () => {
      window.dispatchEvent(new CustomEvent('ide:format'));
      speak('Formatted');
    },
  },
  {
    patterns: [/^undo/i],
    description: 'Undo last edit',
    execute: () => {
      window.dispatchEvent(new CustomEvent('ide:undo'));
      speak('Undo');
    },
  },
  {
    patterns: [/^redo/i],
    description: 'Redo last edit',
    execute: () => {
      window.dispatchEvent(new CustomEvent('ide:redo'));
      speak('Redo');
    },
  },
  {
    patterns: [/^find\s+(.+)/i, /^search\s+for\s+(.+)/i],
    description: 'Search in files',
    execute: (match) => {
      const query = match[1].trim();
      useIDEStore.getState().setSearchQuery(query);
      speak(`Searching for ${query}`);
    },
  },

  // Status
  {
    patterns: [/^(?:what\s+)?files\s+are\s+open/i, /^list\s+open\s+(?:files|tabs)/i],
    description: 'List open files',
    execute: () => {
      const tabs = useIDEStore.getState().openTabs;
      if (tabs.length === 0) {
        speak('No files are open');
      } else {
        speak(`${tabs.length} files open: ${tabs.map(t => t.name).join(', ')}`);
      }
    },
  },
];

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const cleaned = transcript.trim();
  for (const cmd of voiceCommands) {
    for (const pattern of cmd.patterns) {
      const match = cleaned.match(pattern);
      if (match) return cmd;
    }
  }
  return null;
}

export { speak };
