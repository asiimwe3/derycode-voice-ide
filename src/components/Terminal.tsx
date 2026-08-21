import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import '@styles/xterm.css';

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 13,
      theme: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#89b4fa',
        selectionBackground: '#45475a',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    term.writeln('\x1b[36mDerycode Voice IDE Terminal\x1b[0m');
    term.writeln('Type commands or use voice: "run build", "start server"');
    term.writeln('');

    // Simple command handler
    let currentLine = '';
    term.write('$ ');

    term.onData((data) => {
      if (data === '\r') {
        term.writeln('');
        if (currentLine.trim()) {
          term.writeln(`\x1b[33m[command: ${currentLine}]\x1b[0m`);
          // TODO: wire to actual execution backend
        }
        currentLine = '';
        term.write('$ ');
      } else if (data === '\x7f') {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        currentLine += data;
        term.write(data);
      }
    });

    termRef.current = term;

    const resizeHandler = () => fitAddon.fit();
    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      term.dispose();
    };
  }, []);

  return (
    <div className="h-full bg-ide-bg p-2">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
