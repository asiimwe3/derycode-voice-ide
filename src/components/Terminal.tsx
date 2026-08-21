import { useState } from 'react';
import { useIDEStore } from '@/hooks/useIDEStore';

const simulatedCommands: Record<string, (args: string) => string[]> = {
  help: () => [
    'Available commands:',
    '  help          Show this help',
    '  ls            List files',
    '  cat <file>    Show file contents',
    '  echo <text>   Print text',
    '  clear         Clear terminal',
    '  npm <cmd>     Simulated npm command',
    '  node <file>   Simulated node execution',
    '  git <cmd>     Simulated git command',
  ],
  ls: () => {
    const files = useIDEStore.getState().files.map(f => f.path).join('\n');
    return files.split('\n');
  },
  cat: (args) => {
    const file = useIDEStore.getState().files.find(f => f.name === args.trim() || f.path === args.trim());
    if (file?.content) return file.content.split('\n');
    return [`cat: ${args}: No such file`];
  },
  echo: (args) => [args],
  clear: () => [],
  npm: (args) => {
    const sub = args.trim();
    if (sub.startsWith('install')) return ['✓ Added 42 packages in 3.2s', '✓ Done'];
    if (sub.startsWith('run build')) return ['✓ Compiled successfully', '✓ Build complete (1.4s)'];
    if (sub.startsWith('run dev')) return ['▶ Ready on http://localhost:3000'];
    if (sub.startsWith('run test')) return ['✓ All tests passed (3 suites, 12 tests)'];
    if (sub.startsWith('run lint')) return ['✓ No linting errors'];
    return [`npm: ${sub} executed (simulated)`];
  },
  node: (args) => [`Running ${args} (simulated)`, '✓ Process exited with code 0'],
  git: (args) => {
    const sub = args.trim();
    if (sub.startsWith('status')) return ['On branch main', 'nothing to commit, working tree clean'];
    if (sub.startsWith('add')) return ['✓ Staged changes'];
    if (sub.startsWith('commit')) return ['✓ Committed to main'];
    if (sub.startsWith('push')) return ['✓ Pushed to origin/main'];
    if (sub.startsWith('log')) return ['commit abc1234\nAuthor: You\n\n  feat: update files'];
    return [`git: ${sub} (simulated)`];
  },
};

export function Terminal() {
  const terminalLines = useIDEStore(s => s.terminalLines);
  const addTerminalLine = useIDEStore(s => s.addTerminalLine);
  const clearTerminal = useIDEStore(s => s.clearTerminal);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addTerminalLine({ text: `$ ${trimmed}`, type: 'command' });
    setHistory(prev => [...prev, trimmed]);
    setHistoryIdx(-1);

    const parts = trimmed.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1).join(' ');

    if (command === 'clear' || command === 'cls') {
      clearTerminal();
      return;
    }

    const handler = simulatedCommands[command];
    if (handler) {
      const output = handler(args);
      output.forEach(line => addTerminalLine({ text: line, type: 'output' }));
    } else {
      addTerminalLine({ text: `Command not found: ${command}. Type "help" for available commands.`, type: 'error' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs">
        {terminalLines.map((line, i) => (
          <div
            key={i}
            className={
              line.type === 'command' ? 'text-ide-accent' :
              line.type === 'error' ? 'text-ide-danger' :
              line.type === 'info' ? 'text-ide-muted' :
              'text-ide-text'
            }
          >
            {line.text}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-ide-border font-mono text-xs">
        <span className="text-ide-accent">$</span>
        <input
          autoFocus
          className="flex-1 bg-transparent outline-none text-ide-text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              executeCommand(input);
              setInput('');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (history.length > 0) {
                const newIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
                setHistoryIdx(newIdx);
                setInput(history[newIdx]);
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (historyIdx !== -1) {
                const newIdx = historyIdx + 1;
                if (newIdx >= history.length) {
                  setHistoryIdx(-1);
                  setInput('');
                } else {
                  setHistoryIdx(newIdx);
                  setInput(history[newIdx]);
                }
              }
            }
          }}
        />
      </div>
    </div>
  );
}
