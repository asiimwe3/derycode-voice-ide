import { useIDEStore } from '@/hooks/useIDEStore';

export interface VoiceCommand {
  patterns: string[];
  description: string;
  execute: (match: RegExpMatchArray, transcript: string) => void;
}

export const voiceCommands: VoiceCommand[] = [
  {
    patterns: [/^open (.+)/i, /^open file (.+)/i],
    description: 'Open a file by name',
    execute: (_match, _transcript) => {
      const fileName = _match[1].trim();
      const state = useIDEStore.getState();
      // Search for file in tree
      const findFile = (nodes: any[], name: string): string | null => {
        for (const n of nodes) {
          if (n.type === 'file' && n.name === name) return n.path;
          if (n.children) {
            const found = findFile(n.children, name);
            if (found) return found;
          }
        }
        return null;
      };
      const path = findFile(state.files, fileName);
      if (path) {
        state.openFile(path);
        speak(`Opened ${fileName}`);
      } else {
        speak(`File ${fileName} not found`);
      }
    },
  },
  {
    patterns: [/^close tab/i, /^close file/i],
    description: 'Close the active tab',
    execute: () => {
      const state = useIDEStore.getState();
      if (state.activeTab) {
        const tab = state.openTabs.find((t) => t.path === state.activeTab);
        state.closeTab(state.activeTab);
        speak(`Closed ${tab?.name || 'tab'}`);
      }
    },
  },
  {
    patterns: [/^toggle sidebar/i, /^show sidebar/i, /^hide sidebar/i],
    description: 'Toggle the file sidebar',
    execute: () => {
      useIDEStore.getState().toggleSidebar();
    },
  },
  {
    patterns: [/^toggle terminal/i, /^show terminal/i, /^open terminal/i],
    description: 'Toggle the terminal panel',
    execute: () => {
      useIDEStore.getState().toggleTerminal();
    },
  },
  {
    patterns: [/^create (?:new )?file (.+)/i, /^new file (.+)/i],
    description: 'Create a new file',
    execute: (match) => {
      const fileName = match[1].trim();
      const path = fileName.startsWith('/') ? fileName : `/${fileName}`;
      useIDEStore.getState().createFile(path, '');
      speak(`Created ${fileName}`);
    },
  },
  {
    patterns: [/^go to line (\d+)/i, /^line (\d+)/i],
    description: 'Jump to a specific line number',
    execute: (match) => {
      const lineNum = parseInt(match[1], 10);
      // Dispatch custom event that Editor listens for
      window.dispatchEvent(new CustomEvent('ide:goto-line', { detail: { line: lineNum } }));
      speak(`Line ${lineNum}`);
    },
  },
  {
    patterns: [/^delete file (.+)/i, /^remove file (.+)/i],
    description: 'Delete a file',
    execute: (match) => {
      const fileName = match[1].trim();
      const state = useIDEStore.getState();
      const findFile = (nodes: any[], name: string): string | null => {
        for (const n of nodes) {
          if (n.type === 'file' && n.name === name) return n.path;
          if (n.children) {
            const found = findFile(n.children, name);
            if (found) return found;
          }
        }
        return null;
      };
      const path = findFile(state.files, fileName);
      if (path) {
        state.deleteFile(path);
        speak(`Deleted ${fileName}`);
      }
    },
  },
];

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const cleaned = transcript.toLowerCase().trim();
  for (const cmd of voiceCommands) {
    for (const pattern of cmd.patterns) {
      const match = transcript.match(pattern);
      if (match) return cmd;
    }
  }
  return null;
}

export function speak(text: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);
  }
}
