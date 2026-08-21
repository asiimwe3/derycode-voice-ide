import { useEffect, useRef, useState, useCallback } from 'react';
import { useIDEStore } from '@/hooks/useIDEStore';
import { buildProjectPreview } from '@/lib/projectBuilder';
import { fileSystem } from '@/lib/fileSystem';
import { clsx } from 'clsx';
import { RefreshCw, ExternalLink, Maximize2, Minimize2, Eye, EyeOff, Terminal as TerminalIcon, Smartphone, Package } from 'lucide-react';

interface LivePreviewProps {
  code: string;
  language: string;
  autoUpdate?: boolean;
  useProjectFiles?: boolean;
  currentPath?: string;
}

export function LivePreview({ code, language, autoUpdate = true, useProjectFiles = false, currentPath }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [autoMode, setAutoMode] = useState(autoUpdate);
  const [fullscreen, setFullscreen] = useState(false);
  const [consoleLines, setConsoleLines] = useState<{ text: string; type: string }[]>([]);
  const [showConsole, setShowConsole] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [multiFile, setMultiFile] = useState(useProjectFiles);
  const consoleScrollRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generate standalone preview HTML (for playground mode)
  const buildStandaloneHTML = useCallback((lang: string, source: string): string => {
    switch (lang) {
      case 'html':
        return source;
      case 'css':
        return '<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"><style>' + source + '</style></head>\n<body>\n<div style="padding:24px;font-family:system-ui,sans-serif;"><h1>CSS Preview</h1><p>Styled paragraph.</p><button>Button</button><input type="text" placeholder="Input"><ul><li>Item 1</li><li>Item 2</li></ul></div>\n</body>\n</html>';
      case 'javascript':
      case 'jsx':
        return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"></head>\n<body>\n<div id="app" style="padding:24px;font-family:system-ui,sans-serif;"></div>\n<script>\n(function(){var o=console.log,w=console.warn,e=console.error;function s(t,a){var tx=Array.from(a).map(function(x){if(typeof x==="object"){try{return JSON.stringify(x,null,2)}catch(e){return String(x)}}return String(x)}).join(" ");window.parent.postMessage({source:"live-preview",type:t,text:tx},"*")}\nconsole.log=function(){s("log",arguments);o.apply(console,arguments)};console.warn=function(){s("warn",arguments);w.apply(console,arguments)};console.error=function(){s("error",arguments);e.apply(console,arguments)};window.onerror=function(m,s,l,c,err){s("error",[err?err.message:m])};\n})();\n<\/script>\n<script>\ntry{\n' + source + '\n}catch(e){console.error(e.message)}\n</script>\n</body>\n</html>';
      case 'plaintext':
        return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><style>body{padding:24px;font-family:JetBrains Mono,monospace;font-size:14px;white-space:pre-wrap;word-wrap:break-word;color:#333;line-height:1.6;}</style></head>\n<body>' + source.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</body>\n</html>';
      case 'json':
        try {
          JSON.parse(source);
          return '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><style>body{padding:24px;font-family:JetBrains Mono,monospace;font-size:13px;background:#f4f4f8;}pre{background:white;padding:16px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.05);}</style></head>\n<body><pre>' + JSON.stringify(JSON.parse(source), null, 2).replace(/</g, '&lt;') + '</pre></body>\n</html>';
        } catch {
          return '<!DOCTYPE html><html><body><div style="padding:24px;color:#e74c3c;font-family:monospace;">Invalid JSON</div></body></html>';
        }
      default:
        return '<!DOCTYPE html><html><body><div style="padding:24px;color:#888;font-family:system-ui;text-align:center;margin-top:40px;">No live preview for ' + lang + '. Use Run button.</div></body></html>';
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

    const autoLanguages = ['html', 'css', 'javascript', 'jsx', 'json', 'plaintext'];
    if (!autoLanguages.includes(language)) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      setConsoleLines([]);
      let html: string;

      if (multiFile) {
        setLoading(true);
        try {
          html = await buildProjectPreview(code, language, currentPath);
        } catch {
          html = buildStandaloneHTML(language, code);
        }
        setLoading(false);
      } else {
        html = buildStandaloneHTML(language, code);
      }

      if (!cancelled && iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
        }
        setIsReady(true);
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [code, language, autoMode, multiFile, currentPath, refreshKey, buildStandaloneHTML]);

  const handleRefresh = () => {
    setConsoleLines([]);
    setRefreshKey(k => k + 1);
  };

  const handleOpenTab = () => {
    let html: string;
    if (multiFile) {
      buildProjectPreview(code, language, currentPath).then(h => {
        const blob = new Blob([h], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      });
      return;
    }
    html = buildStandaloneHTML(language, code);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const toggleFullscreen = () => setFullscreen(f => !f);

  useEffect(() => {
    if (consoleScrollRef.current) {
      consoleScrollRef.current.scrollTop = consoleScrollRef.current.scrollHeight;
    }
  }, [consoleLines]);

  const hasPreview = ['html', 'css', 'javascript', 'jsx', 'json', 'plaintext'].includes(language);
  const canMultiFile = ['html', 'css', 'javascript', 'jsx'].includes(language);

  if (!hasPreview) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
        <EyeOff size={32} className="text-ide-muted opacity-40" />
        <p className="text-ide-muted text-sm">No live preview for {language}</p>
        <p className="text-ide-muted text-xs">Use the Run button to execute this code.</p>
      </div>
    );
  }

  const container = fullscreen ? 'fixed inset-0 z-50 bg-ide-bg flex flex-col' : 'flex flex-col h-full';

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
          {loading && (
            <span className="flex items-center gap-1 text-[10px] text-ide-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-ide-accent animate-pulse" />
              Building...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Multi-file toggle */}
          {canMultiFile && (
            <button
              onClick={() => setMultiFile(m => !m)}
              className={clsx(
                'p-1.5 rounded transition-colors flex items-center gap-1',
                multiFile ? 'text-ide-accent bg-ide-accent/10' : 'text-ide-muted hover:text-ide-text'
              )}
              title={multiFile ? 'Multi-file: ON (combines files from tree)' : 'Multi-file: OFF (current code only)'}
            >
              <Package size={13} />
              <span className="text-[10px] hidden sm:inline">{multiFile ? 'Linked' : 'Single'}</span>
            </button>
          )}
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

      {/* Multi-file badge */}
      {multiFile && canMultiFile && (
        <div className="px-3 py-1 bg-ide-accent/5 border-b border-ide-accent/10 shrink-0">
          <span className="text-[10px] text-ide-accent flex items-center gap-1">
            <Package size={10} />
            Linked preview — combining HTML + CSS + JS files from your project
          </span>
        </div>
      )}

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
