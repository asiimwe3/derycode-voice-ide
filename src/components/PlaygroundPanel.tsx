import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useIDEStore } from '@/hooks/useIDEStore';
import { runCode, supportedLanguages } from '@/lib/codeRunner';
import { LivePreview } from '@/components/LivePreview';
import { SnippetsPanel } from '@/components/SnippetsPanel';
import {
  downloadCode, buildAndDownloadApp, downloadProjectZip,
  generateShareUrl, parseShareUrl, PROJECT_TEMPLATES
} from '@/lib/exporter';
import { fileSystem } from '@/lib/fileSystem';
import { clsx } from 'clsx';
import {
  Play, Trash2, Loader2, ChevronDown, FileCode2, Copy, Check,
  Code2, Eye, Columns, Download, Package, Share2, Rocket, X, FilePlus,
  Sparkles, Map as MapIcon
} from 'lucide-react';

const CodeEditor = dynamic(() => import('@monaco-editor/react').then(m => m.default), { ssr: false });

const STARTER_CODE: Record<string, string> = {
  javascript: `// JavaScript — live preview shows console output\nconsole.log("Hello, World!");\n\nconst numbers = [1, 2, 3, 4, 5];\nconst sum = numbers.reduce((a, b) => a + b, 0);\nconsole.log("Sum:", sum);\n`,
  typescript: `// TypeScript — click Run to compile and execute\ninterface User {\n  name: string;\n  age: number;\n}\n\nconst user: User = { name: "Alice", age: 28 };\nconsole.log(\`Hello, \${user.name}!\`);\n`,
  tsx: `// TypeScript React — click Run to execute\nconst Button = (props: { label: string }) => props.label;\nconsole.log(Button({ label: "Click me" }));\n`,
  jsx: `// JavaScript React — live preview shows output\nconst greet = (name) => "Hello, " + name + "!";\nconsole.log(greet("World"));\n`,
  python: `# Python — click Run to execute (loads Pyodide)\nprint("Hello, World!")\n\nnumbers = [1, 2, 3, 4, 5]\nprint(f"Sum: {sum(numbers)}")\n`,
  html: `<!-- HTML — live preview updates as you type -->\n<!DOCTYPE html>\n<html>\n<head>\n  <title>My App</title>\n  <style>\n    body {\n      font-family: system-ui, sans-serif;\n      padding: 24px;\n      background: linear-gradient(135deg, #667eea, #764ba2);\n      color: white;\n      min-height: 100vh;\n      margin: 0;\n    }\n    .card {\n      background: rgba(255,255,255,0.15);\n      backdrop-filter: blur(10px);\n      padding: 32px;\n      border-radius: 16px;\n      text-align: center;\n    }\n    button {\n      background: rgba(255,255,255,0.2);\n      border: 1px solid rgba(255,255,255,0.3);\n      color: white;\n      padding: 12px 24px;\n      border-radius: 8px;\n      cursor: pointer;\n      font-size: 16px;\n    }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>Hello World</h1>\n    <p>Edit this and watch it update live.</p>\n    <button onclick="alert('Clicked!')">Click Me</button>\n  </div>\n</body>\n</html>\n`,
  css: `/* CSS — live preview shows styled sample content */\nbody {\n  font-family: system-ui, sans-serif;\n  background: #0f0f1e;\n  color: #e0e0f0;\n  margin: 0;\n  padding: 24px;\n}\nh1 {\n  color: #7c83ff;\n  font-size: 32px;\n  text-transform: uppercase;\n  letter-spacing: 2px;\n}\nbutton {\n  background: linear-gradient(135deg, #7c83ff, #9aa0ff);\n  color: white;\n  border: none;\n  padding: 12px 24px;\n  border-radius: 8px;\n  cursor: pointer;\n}\n`,
  json: `{\n  "name": "My Project",\n  "version": "1.0.0",\n  "features": ["live preview", "voice control", "snippets"]\n}\n`,
  plaintext: 'Type anything here…\n\nThis is plain text — no syntax highlighting.\nThe live preview shows your text as-is.\n',
};

type ViewMode = 'code' | 'preview' | 'split';

export function PlaygroundPanel() {
  const theme = useIDEStore(s => s.theme);
  const fontSize = useIDEStore(s => s.fontSize);
  const minimapEnabled = useIDEStore(s => s.minimapEnabled);
  const setMinimapEnabled = useIDEStore(s => s.setMinimapEnabled);
  const isRunning = useIDEStore(s => s.isRunning);
  const setRunning = useIDEStore(s => s.setRunning);
  const runStatus = useIDEStore(s => s.runStatus);
  const setRunStatus = useIDEStore(s => s.setRunStatus);
  const outputLines = useIDEStore(s => s.outputLines);
  const addOutputLine = useIDEStore(s => s.addOutputLine);
  const clearOutput = useIDEStore(s => s.clearOutput);
  const loadFiles = useIDEStore(s => s.loadFiles);
  const monacoRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const [selectedLang, setSelectedLang] = useState('plaintext');
  const [code, setCode] = useState(STARTER_CODE['plaintext']);
  const [langDropdown, setLangDropdown] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isMobile, setIsMobile] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [toast, setToast] = useState('');
  const [useProjectFiles, setUseProjectFiles] = useState(false);

  const themeMap: Record<string, string> = {
    dark: 'vs-dark',
    light: 'vs',
    midnight: 'vs-dark',
    solarized: 'vs-dark',
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const shared = parseShareUrl();
    if (shared) {
      setCode(shared.code);
      setSelectedLang(shared.language);
      setViewMode('split');
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    setCode(STARTER_CODE[lang] || '');
    setLangDropdown(false);
    clearOutput();
    setUseProjectFiles(false);
  };

  const handleRun = async () => {
    if (isRunning) return;
    clearOutput();
    setRunning(true);
    setRunStatus('Starting…');
    const onOutput = (text: string) => addOutputLine({ text, type: 'output' as const });
    const onError = (text: string) => addOutputLine({ text, type: 'error' as const });
    const onStatus = (status: string) => setRunStatus(status);
    try {
      await runCode(selectedLang, code, onOutput, onError, onStatus);
      if (!outputLines.some(l => l.type === 'error')) {
        addOutputLine({ text: '\n✓ Done.', type: 'success' as const });
      }
    } catch (e: any) {
      addOutputLine({ text: `Error: ${e?.message || String(e)}`, type: 'error' as const });
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    downloadCode(code, selectedLang);
    setExportMenu(false);
    showToast('File downloaded!');
  };

  const handleBuildApp = () => {
    buildAndDownloadApp(code, selectedLang);
    setExportMenu(false);
    showToast('Standalone app downloaded!');
  };

  const handleDownloadZip = async () => {
    setExportMenu(false);
    try { await downloadProjectZip(); showToast('ZIP downloaded!'); }
    catch { showToast('ZIP failed'); }
  };

  const handleShare = () => {
    const url = generateShareUrl(code, selectedLang);
    setShareUrl(url);
    setExportMenu(false);
    navigator.clipboard.writeText(url).then(() => showToast('Share link copied!'));
  };

  const handleNewProject = async (template: typeof PROJECT_TEMPLATES[0]) => {
    setShowTemplates(false);
    await fileSystem.clear();
    for (const f of template.files) {
      await fileSystem.create({
        path: f.path,
        name: f.path.split('/').pop() || f.path,
        type: 'file',
        content: f.content,
        parentId: '/',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    await loadFiles();
    const htmlFile = template.files.find((f: { path: string; content: string }) => f.path.endsWith('.html'));
    if (htmlFile) {
      setCode(htmlFile.content);
      setSelectedLang('html');
      setUseProjectFiles(true);
    }
    showToast(`${template.label} created!`);
  };

  const handleInsertSnippet = (snippetCode: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const position = editor.getPosition();
      editor.executeEdits('snippet', [{
        range: new monacoRef.current.Range(
          position.lineNumber, position.column,
          position.lineNumber, position.column
        ),
        text: snippetCode,
      }]);
    } else {
      setCode(prev => prev + '\n' + snippetCode);
    }
    setShowSnippets(false);
    showToast('Snippet inserted!');
  };

  const currentLang = supportedLanguages.find(l => l.id === selectedLang);
  const hasPreview = ['html', 'css', 'javascript', 'jsx', 'json', 'plaintext'].includes(selectedLang);
  const canBuildApp = ['html', 'css', 'javascript', 'jsx'].includes(selectedLang);
  const canMultiFile = ['html', 'css', 'javascript', 'jsx'].includes(selectedLang);

  useEffect(() => {
    if (isMobile && viewMode === 'split') setViewMode('code');
    if (!isMobile && viewMode === 'code' && hasPreview) setViewMode('split');
  }, [isMobile]); // eslint-disable-line

  const editorOptions = {
    fontSize,
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    fontLigatures: true,
    minimap: { enabled: minimapEnabled },
    scrollBeyondLastLine: false,
    tabSize: 2,
    automaticLayout: true,
    cursorBlinking: 'smooth' as const,
    smoothScrolling: true,
    padding: { top: 12, bottom: 12 },
    wordWrap: 'on' as const,
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true, indentation: true },
    formatOnPaste: true,
    formatOnType: true,
    suggestOnTriggerCharacters: true,
    tabCompletion: 'on' as const,
    linkedEditing: true,
    renderWhitespace: 'selection' as const,
    cursorSmoothCaretAnimation: 'on' as const,
  };

  return (
    <div className="flex flex-col h-full bg-ide-bg relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-ide-surface border-b border-ide-border shrink-0 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setLangDropdown(!langDropdown)}
              className="flex items-center gap-1.5 bg-ide-bg border border-ide-border rounded-md px-2.5 py-1.5 text-xs text-ide-text hover:border-ide-accent transition-colors"
            >
              <FileCode2 size={12} className="text-ide-accent" />
              <span className="truncate max-w-[80px] sm:max-w-none">{currentLang?.label || 'Language'}</span>
              <ChevronDown size={12} className="text-ide-muted" />
            </button>
            {langDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLangDropdown(false)} />
                <div className="absolute top-full left-0 mt-1 z-20 bg-ide-surface border border-ide-border rounded-lg shadow-xl py-1 min-w-[220px] max-h-[300px] overflow-y-auto">
                  {supportedLanguages.map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => handleLanguageChange(lang.id)}
                      className={clsx(
                        'w-full text-left px-3 py-2 hover:bg-ide-surface-hover/50 transition-colors',
                        selectedLang === lang.id ? 'text-ide-accent' : 'text-ide-text'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{lang.label}</span>
                        <span className="text-[10px] text-ide-muted">.{lang.ext}</span>
                      </div>
                      <p className="text-[10px] text-ide-muted mt-0.5">{lang.note}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View mode toggle */}
          {hasPreview && (
            <div className="flex items-center gap-0.5 bg-ide-bg border border-ide-border rounded-md p-0.5">
              <button onClick={() => setViewMode('code')} className={clsx('p-1.5 rounded transition-colors', viewMode === 'code' ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-muted hover:text-ide-text')} title="Code only"><Code2 size={11} /></button>
              <button onClick={() => setViewMode('split')} className={clsx('p-1.5 rounded transition-colors', viewMode === 'split' ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-muted hover:text-ide-text')} title="Split view"><Columns size={11} /></button>
              <button onClick={() => setViewMode('preview')} className={clsx('p-1.5 rounded transition-colors', viewMode === 'preview' ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-muted hover:text-ide-text')} title="Preview only"><Eye size={11} /></button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Snippets button */}
          <button
            onClick={() => setShowSnippets(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] text-ide-muted hover:text-ide-accent transition-colors"
            title="Code snippets"
          >
            <Sparkles size={12} />
          </button>

          {/* Minimap toggle */}
          <button
            onClick={() => setMinimapEnabled(!minimapEnabled)}
            className={clsx('p-1.5 rounded-md transition-colors', minimapEnabled ? 'text-ide-accent' : 'text-ide-muted hover:text-ide-text')}
            title="Toggle minimap"
          >
            <MapIcon size={12} />
          </button>

          {/* Export / Build menu */}
          <div className="relative">
            <button
              onClick={() => setExportMenu(!exportMenu)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium bg-ide-accent/10 text-ide-accent hover:bg-ide-accent/20 transition-colors"
              title="Export & Build"
            >
              <Rocket size={12} />
              <span className="hidden sm:inline">Build</span>
              <ChevronDown size={10} />
            </button>
            {exportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenu(false)} />
                <div className="absolute top-full right-0 mt-1 z-20 bg-ide-surface border border-ide-border rounded-lg shadow-xl py-1 min-w-[200px]">
                  <button onClick={handleDownload} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-surface-hover/50 transition-colors text-left">
                    <Download size={13} className="text-ide-muted" />
                    <div><div className="text-xs text-ide-text font-medium">Download File</div><div className="text-[10px] text-ide-muted">Save current code</div></div>
                  </button>
                  {canBuildApp && (
                    <button onClick={handleBuildApp} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-surface-hover/50 transition-colors text-left">
                      <Rocket size={13} className="text-ide-success" />
                      <div><div className="text-xs text-ide-text font-medium">Build HTML App</div><div className="text-[10px] text-ide-muted">Standalone .html file</div></div>
                    </button>
                  )}
                  <button onClick={handleDownloadZip} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-surface-hover/50 transition-colors text-left">
                    <Package size={13} className="text-ide-warning" />
                    <div><div className="text-xs text-ide-text font-medium">Download ZIP</div><div className="text-[10px] text-ide-muted">All files as .zip</div></div>
                  </button>
                  <button onClick={handleShare} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-surface-hover/50 transition-colors text-left">
                    <Share2 size={13} className="text-ide-accent" />
                    <div><div className="text-xs text-ide-text font-medium">Share Code</div><div className="text-[10px] text-ide-muted">Copy shareable link</div></div>
                  </button>
                  <div className="border-t border-ide-border my-1" />
                  <button onClick={() => { setShowTemplates(true); setExportMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-surface-hover/50 transition-colors text-left">
                    <FilePlus size={13} className="text-ide-muted" />
                    <div><div className="text-xs text-ide-text font-medium">New Project</div><div className="text-[10px] text-ide-muted">Start from template</div></div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={handleCopy} className="p-1.5 rounded text-[11px] text-ide-muted hover:text-ide-text transition-colors" title="Copy code">
            {copied ? <Check size={13} className="text-ide-success" /> : <Copy size={13} />}
          </button>
          <button onClick={clearOutput} className="text-ide-muted hover:text-ide-danger transition-colors p-1.5" title="Clear output">
            <Trash2 size={13} />
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all', isRunning ? 'bg-ide-surface-hover text-ide-muted cursor-wait' : 'bg-ide-success/20 text-ide-success hover:bg-ide-success/30')}
          >
            {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {isRunning ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'code' && (
          <div className="h-full">
            <CodeEditor
              height="100%"
              language={selectedLang === 'tsx' ? 'typescript' : selectedLang === 'jsx' ? 'javascript' : selectedLang === 'plaintext' ? 'plaintext' : selectedLang}
              value={code}
              theme={themeMap[theme] || 'vs-dark'}
              beforeMount={(monaco) => { monacoRef.current = monaco; }}
              onMount={(editor) => { editorRef.current = editor; }}
              onChange={(val) => setCode(val || '')}
              options={editorOptions}
            />
          </div>
        )}

        {viewMode === 'preview' && hasPreview && (
          <LivePreview code={code} language={selectedLang} autoUpdate={true} useProjectFiles={useProjectFiles} />
        )}

        {viewMode === 'split' && hasPreview && (
          <div className="flex h-full" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
            <div className={clsx('min-h-0 overflow-hidden', isMobile ? 'h-1/2 border-b border-ide-border' : 'w-1/2 border-r border-ide-border')}>
              <CodeEditor
                height="100%"
                language={selectedLang === 'tsx' ? 'typescript' : selectedLang === 'jsx' ? 'javascript' : selectedLang === 'plaintext' ? 'plaintext' : selectedLang}
                value={code}
                theme={themeMap[theme] || 'vs-dark'}
                beforeMount={(monaco) => { monacoRef.current = monaco; }}
                onMount={(editor) => { editorRef.current = editor; }}
                onChange={(val) => setCode(val || '')}
                options={editorOptions}
              />
            </div>
            <div className={clsx('min-h-0 overflow-hidden', isMobile ? 'h-1/2' : 'w-1/2')}>
              <LivePreview code={code} language={selectedLang} autoUpdate={true} useProjectFiles={useProjectFiles} />
            </div>
          </div>
        )}

        {/* Text output */}
        {(viewMode === 'code' || !hasPreview) && (outputLines.length > 0 || isRunning) && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-ide-border bg-ide-bg flex flex-col max-h-[40%] shrink-0">
            <div className="flex items-center justify-between px-3 py-1.5 bg-ide-surface/50 border-b border-ide-border">
              <span className="text-[10px] font-semibold text-ide-muted uppercase tracking-wide">Output</span>
              {isRunning && <span className="text-[10px] text-ide-accent flex items-center gap-1"><Loader2 size={10} className="animate-spin" />{runStatus}</span>}
            </div>
            <div className="overflow-y-auto p-2 font-mono text-xs max-h-32">
              {outputLines.map((line, i) => (
                <div key={i} className={clsx('whitespace-pre-wrap break-words py-0.5', line.type === 'error' && 'text-ide-danger', line.type === 'success' && 'text-ide-success', line.type === 'output' && 'text-ide-text')}>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-ide-surface border border-ide-accent/30 rounded-lg px-4 py-2 shadow-xl animate-slide-up">
          <p className="text-xs text-ide-accent">{toast}</p>
        </div>
      )}

      {/* Snippets panel */}
      {showSnippets && (
        <SnippetsPanel language={selectedLang} onInsert={handleInsertSnippet} onClose={() => setShowSnippets(false)} />
      )}

      {/* Templates modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-ide-surface border border-ide-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
              <h2 className="text-sm font-semibold text-ide-text">New Project</h2>
              <button onClick={() => setShowTemplates(false)} className="text-ide-muted hover:text-ide-text"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto p-4">
              <p className="text-xs text-ide-muted mb-3">Pick a template. This replaces your current files.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROJECT_TEMPLATES.map(tpl => (
                  <button key={tpl.id} onClick={() => handleNewProject(tpl)} className="flex items-start gap-3 p-4 rounded-lg border border-ide-border bg-ide-bg hover:border-ide-accent hover:bg-ide-surface-hover/30 transition-all text-left">
                    <span className="text-2xl">{tpl.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-ide-text">{tpl.label}</div>
                      <div className="text-[11px] text-ide-muted mt-0.5">{tpl.description}</div>
                      <div className="text-[10px] text-ide-accent mt-1">{tpl.files.length} file{tpl.files.length !== 1 ? 's' : ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share URL modal */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={() => setShareUrl('')}>
          <div className="bg-ide-surface border border-ide-border rounded-xl shadow-2xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ide-text">Share Code</h2>
              <button onClick={() => setShareUrl('')} className="text-ide-muted hover:text-ide-text"><X size={18} /></button>
            </div>
            <p className="text-xs text-ide-muted mb-2">Anyone with this link can open and run your code:</p>
            <div className="flex items-center gap-2">
              <input readOnly value={shareUrl} className="flex-1 bg-ide-bg border border-ide-border rounded-md px-3 py-2 text-xs text-ide-text outline-none" onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); showToast('Copied!'); }} className="px-3 py-2 rounded-md bg-ide-accent/20 text-ide-accent text-xs font-medium hover:bg-ide-accent/30">
                <Copy size={12} className="inline mr-1" />Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
