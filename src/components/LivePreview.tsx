import { useEffect, useRef, useState, useCallback } from 'react';
import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';
import { RefreshCw, ExternalLink, Maximize2, Minimize2, Eye, EyeOff, Terminal as TerminalIcon } from 'lucide-react';

interface LivePreviewProps {
  code: string;
  language: string;
  autoUpdate?: boolean;
}

export function LivePreview({ code, language, autoUpdate = true }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [autoMode, setAutoMode] = useState(autoUpdate);
  const [fullscreen, setFullscreen] = useState(false);
  const [consoleLines, setConsoleLines] = useState<{ text: string; type: string }[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const consoleScrollRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Generate HTML based on language
  const buildPreviewHTML = useCallback((lang: string, source: string): string => {
    switch (lang) {
      case 'html':
        return source;

      case 'css':
        return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${source}</style></head>
<body>
  <div style="padding: 24px; font-family: system-ui, sans-serif;">
    <h1>CSS Preview</h1>
    <p>This paragraph shows your styles applied to text.</p>
    <button>Sample Button</button>
    <a href="#">A link</a>
    <ul><li>Item One</li><li>Item Two</li><li>Item Three</li></ul>
    <input type="text" placeholder="Text input" />
    <div style="margin-top: 16px; padding: 16px; border: 1px solid #ccc; border-radius: 8px;">
      <p>A box with padding and border</p>
    </div>
  </div>
</body>
</html>`;

      case 'javascript':
      case 'jsx':
        return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <div id="app" style="padding: 24px; font-family: system-ui, sans-serif;"></div>
  <script>
    (function() {
      const origLog = console.log;
      const origWarn = console.warn;
      const origErr = console.error;
      const origInfo = console.info;
      const send = (type, args) => {
        const text = args.map(a => {
          if (a === null) return 'null';
          if (a === undefined) return 'undefined';
          if (typeof a === 'object') { try { return JSON.stringify(a, null, 2); } catch { return String(a); } }
          return String(a);
        }).join(' ');
        window.parent.postMessage({ source: 'live-preview', type, text }, '*');
      };
      console.log = (...a) => { send('log', a); origLog(...a); };
      console.warn = (...a) => { send('warn', a); origWarn(...a); };
      console.error = (...a) => { send('error', a); origErr(...a); };
      console.info = (...a) => { send('info', a); origInfo(...a); };
      window.onerror = (msg, src, line, col, err) => {
        send('error', [err ? err.message + '\\n' + (err.stack || '') : msg]);
      };
      try {
        ${source}
      } catch (e) {
        send('error', [e.message + '\\n' + (e.stack || '')]);
      }
    })();
  </script>
</body>
</html>`;

      case 'typescript':
      case 'tsx':
        // TypeScript needs transpilation — show placeholder, actual execution happens via Run button
        return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body>
  <div style="padding: 24px; font-family: system-ui, sans-serif; color: #888; text-align: center; margin-top: 40px;">
    <p style="font-size: 14px;">TypeScript preview requires compilation.</p>
    <p style="font-size: 12px; color: #aaa;">Click the <strong>Run</strong> button to compile and execute TypeScript.</p>
  </div>
</body></html>`;

      case 'python':
        return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body>
  <div style="padding: 24px; font-family: system-ui, sans-serif; color: #888; text-align: center; margin-top: 40px;">
    <p style="font-size: 14px;">Python preview uses Pyodide (WebAssembly).</p>
    <p style="font-size: 12px; color: #aaa;">Click the <strong>Run</strong> button to execute Python.</p>
  </div>
</body></html>`;

      case 'json':
        try {
          const parsed = JSON.parse(source);
          const formatted = JSON.stringify(parsed, null, 2);
          return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { padding: 24px; font-family: 'JetBrains Mono', monospace; font-size: 13px; }
  pre { background: #f4f4f8; padding: 16px; border-radius: 8px; overflow-x: auto; }
  .key { color: #7c83ff; } .str { color: #2ecc71; } .num { color: #e67e22; } .bool { color: #e74c3c; }
</style></head>
<body>
  <pre>${formatted.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>
</body></html>`;
        } catch {
          return `<!DOCTYPE html><html><body>
          <div style="padding:24px;color:#e74c3c;font-family:monospace;">Invalid JSON</div>
          </body></html>`;
        }

      case 'plaintext':
        return `<!DOCTYPE html>
<html><head><meta charset=Tf-8><style>body { padding: 24px; font-family: 'JetBrains Mono', monospace; font-size: 14px; white-space: pre-wrap; word-wrap: break-word; color: #333; line-height: 1.6; }</style></head>
<body>${source.replace(/      default:/g, '      default:amp;').replace(/</g, '      default:lt;')}</body></html>`;

      default:
        return `<!DOCTYPE html><html><body>
        <div style="padding:24px;color:#888;font-family:system-ui;text-align:center;margin-top:40px;">
          No live preview for this language. Use the Run button to execute.
        </div></body></html>`;
    }
  }, []);

  // Listen for console messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.source === 'live-preview') {
        setConsoleLines(prev => [...prev, { text: e.data.text, type: e.data.type }]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Auto-update preview (debounced)
  useEffect(() => {
    if (!autoMode) return;

    // Only auto-preview for HTML, CSS, JS, JSX, JSON
    const autoLanguages = ['html', 'css', 'javascript', 'jsx', 'json', 'plaintext'];
    if (!autoLanguages.includes(language)) return;

    const timer = setTimeout(() => {
      setConsoleLines([]);
      const html = buildPreviewHTML(language, code);
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
        }
      }
      setIsReady(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [code, language, autoMode, buildPreviewHTML, refreshKey]);

  // Manual refresh
  const handleRefresh = () => {
    setConsoleLines([]);
    setRefreshKey(k => k + 1);
  };

  // Open in new tab
  const handleOpenTab = () => {
    const html = buildPreviewHTML(language, code);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => setFullscreen(f => !f);

  // Scroll console to bottom
  useEffect(() => {
    if (consoleScrollRef.current) {
      consoleScrollRef.current.scrollTop = consoleScrollRef.current.scrollHeight;
    }
  }, [consoleLines]);

  const hasPreview = ['html', 'css', 'javascript', 'jsx', 'json', 'plaintext'].includes(language);

  if (!hasPreview) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
        <EyeOff size={32} className="text-ide-muted opacity-40" />
        <p className="text-ide-muted text-sm">No live preview for {language}</p>
        <p className="text-ide-muted text-xs">Use the Run button to execute this code.</p>
      </div>
    );
  }

  const container = fullscreen
    ? 'fixed inset-0 z-50 bg-ide-bg flex flex-col'
    : 'flex flex-col h-full';

  return (
    <div className={container}>
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-ide-surface border-b border-ide-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-ide-muted uppercase tracking-wide">Preview</span>
          {autoMode && isReady && (
            <span className="flex items-center gap-1 text-[10px] text-ide-success">
              <span className="w-1.5 h-1.5 rounded-full bg-ide-success animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoMode(a => !a)}
            className={clsx(
              'p-1.5 rounded transition-colors',
              autoMode ? 'text-ide-accent' : 'text-ide-muted hover:text-ide-text'
            )}
            title={autoMode ? 'Auto-update: ON' : 'Auto-update: OFF'}
          >
            {autoMode ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button
            onClick={handleRefresh}
            className="text-ide-muted hover:text-ide-text transition-colors p-1.5"
            title="Refresh preview"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={handleOpenTab}
            className="text-ide-muted hover:text-ide-text transition-colors p-1.5"
            title="Open in new tab"
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="text-ide-muted hover:text-ide-text transition-colors p-1.5"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Iframe preview */}
      <div className="flex-1 min-h-0 relative">
        <iframe
          ref={iframeRef}
          className="w-full h-full bg-white"
          sandbox="allow-scripts allow-modals allow-same-origin"
          title="Live Preview"
        />
      </div>

      {/* Console output */}
      {showConsole && consoleLines.length > 0 && (
        <div className="border-t border-ide-border bg-ide-bg shrink-0 max-h-32 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1 bg-ide-surface/50 border-b border-ide-border">
            <span className="text-[10px] font-semibold text-ide-muted uppercase tracking-wide flex items-center gap-1">
              <TerminalIcon size={10} />
              Console
            </span>
            <button
              onClick={() => setConsoleLines([])}
              className="text-[10px] text-ide-muted hover:text-ide-danger"
            >
              Clear
            </button>
          </div>
          <div ref={consoleScrollRef} className="overflow-y-auto p-2 font-mono text-xs max-h-24">
            {consoleLines.map((line, i) => (
              <div
                key={i}
                className={clsx(
                  'whitespace-pre-wrap break-words py-0.5',
                  line.type === 'error' && 'text-ide-danger',
                  line.type === 'warn' && 'text-ide-warning',
                  line.type === 'info' && 'text-ide-muted',
                  (line.type === 'log' || !line.type) && 'text-ide-text'
                )}
              >
                {line.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Console toggle button (when empty) */}
      {consoleLines.length === 0 && (
        <button
          onClick={() => setShowConsole(s => !s)}
          className="absolute bottom-2 right-2 text-[10px] text-ide-muted bg-ide-surface/80 rounded px-2 py-1 border border-ide-border hover:text-ide-text transition-colors"
        >
          <TerminalIcon size={10} className="inline mr-1" />
          Console
        </button>
      )}

      {fullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-12 right-3 z-10 bg-ide-surface border border-ide-border rounded-lg px-3 py-1.5 text-xs text-ide-text hover:bg-ide-surface-hover"
        >
          <Minimize2 size={13} className="inline mr-1" />
          Exit Fullscreen
        </button>
      )}
    </div>
  );
}
