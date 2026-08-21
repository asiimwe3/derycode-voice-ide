import { useEffect, useRef } from 'react';
import { useIDEStore, getRunnerLanguage } from '@/hooks/useIDEStore';
import { runCode } from '@/lib/codeRunner';
import { Play, Square, Trash2, Loader2, FileCode2 } from 'lucide-react';
import { clsx } from 'clsx';

export function OutputPanel() {
  const outputLines = useIDEStore(s => s.outputLines);
  const clearOutput = useIDEStore(s => s.clearOutput);
  const isRunning = useIDEStore(s => s.isRunning);
  const runStatus = useIDEStore(s => s.runStatus);
  const setRunning = useIDEStore(s => s.setRunning);
  const setRunStatus = useIDEStore(s => s.setRunStatus);
  const addOutputLine = useIDEStore(s => s.addOutputLine);
  const setOutputVisible = useIDEStore(s => s.setOutputVisible);
  const htmlPreview = useIDEStore(s => s.htmlPreview);
  const setHtmlPreview = useIDEStore(s => s.setHtmlPreview);
  const openTabs = useIDEStore(s => s.openTabs);
  const activeTab = useIDEStore(s => s.activeTab);
  const saveFile = useIDEStore(s => s.saveFile);
  const toggleTerminal = useIDEStore(s => s.toggleTerminal);
  const setTerminalVisible = useIDEStore(s => s.setTerminalVisible);
  const scrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentTab = openTabs.find(t => t.path === activeTab);
  const runnerLang = currentTab ? getRunnerLanguage(currentTab.name) : '';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputLines, runStatus]);

  useEffect(() => {
    if (iframeRef.current && htmlPreview !== null) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlPreview);
        doc.close();
      }
    }
  }, [htmlPreview]);

  const handleRun = async () => {
    if (!currentTab || isRunning) return;

    // Save before running
    if (currentTab.dirty) {
      await saveFile(currentTab.path);
    }

    clearOutput();
    setRunning(true);
    setOutputVisible(true);
    setTerminalVisible(false);
    setRunStatus('Starting…');

    const onOutput = (text: string) => addOutputLine({ text, type: 'output' as const });
    const onError = (text: string) => addOutputLine({ text, type: 'error' as const });
    const onStatus = (status: string) => setRunStatus(status);

    try {
      const result = await runCode(runnerLang, currentTab.content, onOutput, onError, onStatus);
      if (result.htmlPreview !== undefined) {
        setHtmlPreview(result.htmlPreview);
      }
      if (!outputLines.some(l => l.type === 'error')) {
        addOutputLine({ text: `\n✓ Execution completed successfully.`, type: 'success' as const });
      }
    } catch (e: any) {
      addOutputLine({ text: `Execution failed: ${e?.message || String(e)}`, type: 'error' as const });
    } finally {
      setRunning(false);
    }
  };

  const canRun = runnerLang && !isRunning && currentTab;

  return (
    <div className="flex flex-col h-full bg-ide-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 h-9 bg-ide-surface border-b border-ide-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-ide-muted uppercase tracking-wide">Output</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] text-ide-accent">
              <Loader2 size={10} className="animate-spin" />
              {runStatus}
            </span>
          )}
          {!isRunning && runStatus && (
            <span className="text-[10px] text-ide-muted">{runStatus}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={!canRun}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all',
              canRun
                ? 'bg-ide-success/20 text-ide-success hover:bg-ide-success/30'
                : 'bg-ide-surface-hover text-ide-muted cursor-not-allowed'
            )}
            title={runnerLang ? `Run ${runnerLang} code` : 'This file type cannot be run in the browser'}
          >
            {isRunning ? <Square size={11} /> : <Play size={11} />}
            {isRunning ? 'Running…' : 'Run'}
          </button>
          <button
            onClick={clearOutput}
            className="text-ide-muted hover:text-ide-danger transition-colors p-1"
            title="Clear output"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* HTML Preview */}
        {htmlPreview !== null && (
          <div className="flex-1 min-h-0 border-b border-ide-border">
            <div className="px-3 py-1 text-[10px] text-ide-muted bg-ide-surface/50">Live Preview</div>
            <iframe
              ref={iframeRef}
              className="w-full h-full bg-white"
              sandbox="allow-scripts allow-modals"
              title="HTML Preview"
            />
          </div>
        )}

        {/* Text output */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs">
          {outputLines.length === 0 && !isRunning && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
              <FileCode2 size={32} className="text-ide-muted opacity-40" />
              <p className="text-ide-muted text-sm">
                {runnerLang
                  ? `Click Run to execute this ${runnerLang} file.`
                  : 'Open a JavaScript, TypeScript, Python, HTML, CSS, or JSON file to run it.'}
              </p>
              <p className="text-ide-muted text-xs">
                Supported languages: JavaScript, TypeScript, Python, HTML, CSS, JSON
              </p>
            </div>
          )}
          {outputLines.map((line, i) => (
            <div
              key={i}
              className={clsx(
                'whitespace-pre-wrap break-words py-0.5',
                line.type === 'error' && 'text-ide-danger',
                line.type === 'success' && 'text-ide-success',
                line.type === 'info' && 'text-ide-muted',
                line.type === 'output' && 'text-ide-text'
              )}
            >
              {line.text}
            </div>
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 py-1 text-ide-accent">
              <Loader2 size={12} className="animate-spin" />
              <span className="text-xs">{runStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
