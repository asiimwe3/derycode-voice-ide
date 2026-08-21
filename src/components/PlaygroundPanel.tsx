import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useIDEStore } from '@/hooks/useIDEStore';
import { runCode, supportedLanguages } from '@/lib/codeRunner';
import { LivePreview } from '@/components/LivePreview';
import { clsx } from 'clsx';
import { Play, Trash2, Loader2, ChevronDown, FileCode2, Copy, Check, Code2, Eye, Columns } from 'lucide-react';

const CodeEditor = dynamic(() => import('@monaco-editor/react').then(m => m.default), { ssr: false });

const STARTER_CODE: Record<string, string> = {
  javascript: `// Type your JavaScript code here\n// The live preview shows console output as you type\nconsole.log("Hello, World!");\n\nconst numbers = [1, 2, 3, 4, 5];\nconst sum = numbers.reduce((a, b) => a + b, 0);\nconsole.log("Sum:", sum);\n\n// Try adding DOM manipulation:\n// document.body.innerHTML = "<h1>Hello!</h1>";\n`,
  typescript: `// Type your TypeScript code here\ninterface User {\n  name: string;\n  age: number;\n}\n\nconst user: User = { name: "Alice", age: 28 };\nconsole.log(\`Hello, \${user.name}!\`);\n`,
  tsx: `// Type your TypeScript React code here\nconst Button = (props: { label: string }) => {\n  return props.label;\n};\n\nconsole.log(Button({ label: "Click me" }));\n`,
  jsx: `// Type your JavaScript React code here\nconst greet = (name) => "Hello, " + name + "!";\nconsole.log(greet("World"));\n`,
  python: `# Type your Python code here\nprint("Hello, World!")\n\nnumbers = [1, 2, 3, 4, 5]\ntotal = sum(numbers)\nprint(f"Sum: {total}")\n`,
  html: `<!-- Type your HTML here -->\n<!-- The preview updates live as you type -->\n<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n  <style>\n    body {\n      font-family: system-ui, sans-serif;\n      padding: 24px;\n      background: linear-gradient(135deg, #667eea, #764ba2);\n      color: white;\n      min-height: 100vh;\n    }\n    .card {\n      background: rgba(255,255,255,0.15);\n      backdrop-filter: blur(10px);\n      padding: 32px;\n      border-radius: 16px;\n      text-align: center;\n    }\n    h1 { margin: 0 0 8px; }\n    button {\n      background: rgba(255,255,255,0.2);\n      border: 1px solid rgba(255,255,255,0.3);\n      color: white;\n      padding: 12px 24px;\n      border-radius: 8px;\n      cursor: pointer;\n    }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1>Live Preview</h1>\n    <p>Edit the code and watch it update in real time.</p>\n    <button onclick="alert('Clicked!')">Click Me</button>\n  </div>\n</body>\n</html>\n`,
  css: `/* Type your CSS here */\n/* The preview shows sample content with your styles */\nbody {\n  font-family: system-ui, sans-serif;\n  background: #0f0f1e;\n  color: #e0e0f0;\n}\nh1 {\n  color: #7c83ff;\n  font-size: 32px;\n  text-transform: uppercase;\n  letter-spacing: 2px;\n}\nbutton {\n  background: linear-gradient(135deg, #7c83ff, #9aa0ff);\n  color: white;\n  border: none;\n  padding: 12px 24px;\n  border-radius: 8px;\n  cursor: pointer;\n  font-size: 14px;\n}\nbutton:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(124, 131, 255, 0.4);\n}\ninput {\n  padding: 8px 12px;\n  border: 1px solid #2d2d4a;\n  border-radius: 6px;\n  background: #1a1a2e;\n  color: #e0e0f0;\n}\n`,
  json: `{\n  "name": "My Project",\n  "version": "1.0.0",\n  "languages": ["JavaScript", "TypeScript", "Python"]\n}\n`,
};

type ViewMode = 'code' | 'preview' | 'split';

export function PlaygroundPanel() {
  const theme = useIDEStore(s => s.theme);
  const fontSize = useIDEStore(s => s.fontSize);
  const isRunning = useIDEStore(s => s.isRunning);
  const setRunning = useIDEStore(s => s.setRunning);
  const runStatus = useIDEStore(s => s.runStatus);
  const setRunStatus = useIDEStore(s => s.setRunStatus);
  const outputLines = useIDEStore(s => s.outputLines);
  const addOutputLine = useIDEStore(s => s.addOutputLine);
  const clearOutput = useIDEStore(s => s.clearOutput);
  const monacoRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const [selectedLang, setSelectedLang] = useState('html');
  const [code, setCode] = useState(STARTER_CODE['html']);
  const [langDropdown, setLangDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isMobile, setIsMobile] = useState(false);

  const themeMap: Record<string, string> = {
    dark: 'vs-dark',
    light: 'vs',
    midnight: 'vs-dark',
    solarized: 'vs-dark',
  };

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    setCode(STARTER_CODE[lang] || '');
    setLangDropdown(false);
    clearOutput();
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
        addOutputLine({ text: '\n✓ Execution completed successfully.', type: 'success' as const });
      }
    } catch (e: any) {
      addOutputLine({ text: `Execution failed: ${e?.message || String(e)}`, type: 'error' as const });
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const currentLang = supportedLanguages.find(l => l.id === selectedLang);
  const hasPreview = ['html', 'css', 'javascript', 'jsx', 'json'].includes(selectedLang);

  // On mobile, default to 'code' mode; on desktop default to 'split'
  useEffect(() => {
    if (isMobile && viewMode === 'split') setViewMode('code');
    if (!isMobile && viewMode === 'code' && hasPreview) setViewMode('split');
  }, [isMobile]); // eslint-disable-line

  return (
    <div className="flex flex-col h-full bg-ide-bg">
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
              <span className="truncate max-w-[100px] sm:max-w-none">{currentLang?.label || 'Select Language'}</span>
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
              <button
                onClick={() => setViewMode('code')}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                  viewMode === 'code' ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-muted hover:text-ide-text'
                )}
                title="Code only"
              >
                <Code2 size={11} />
              </button>
              {hasPreview && (
                <button
                  onClick={() => setViewMode('split')}
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                    viewMode === 'split' ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-muted hover:text-ide-text'
                  )}
                  title="Split view"
                >
                  <Columns size={11} />
                </button>
              )}
              {hasPreview && (
                <button
                  onClick={() => setViewMode('preview')}
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                    viewMode === 'preview' ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-muted hover:text-ide-text'
                  )}
                  title="Preview only"
                >
                  <Eye size={11} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-[11px] text-ide-muted hover:text-ide-text transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={13} className="text-ide-success" /> : <Copy size={13} />}
          </button>
          <button
            onClick={clearOutput}
            className="text-ide-muted hover:text-ide-danger transition-colors p-1.5"
            title="Clear output"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              isRunning
                ? 'bg-ide-surface-hover text-ide-muted cursor-wait'
                : 'bg-ide-success/20 text-ide-success hover:bg-ide-success/30'
            )}
          >
            {isRunning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {isRunning ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      {/* Content area — Code, Preview, or Split */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'code' && (
          <div className="h-full">
            <CodeEditor
              height="100%"
              language={selectedLang === 'tsx' ? 'typescript' : selectedLang === 'jsx' ? 'javascript' : selectedLang}
              value={code}
              theme={themeMap[theme] || 'vs-dark'}
              beforeMount={(monaco) => { monacoRef.current = monaco; }}
              onMount={(editor) => { editorRef.current = editor; }}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: 2,
                automaticLayout: true,
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                padding: { top: 12, bottom: 12 },
                wordWrap: 'on',
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
        )}

        {viewMode === 'preview' && hasPreview && (
          <LivePreview code={code} language={selectedLang} autoUpdate={true} />
        )}

        {viewMode === 'split' && hasPreview && (
          <div className="flex h-full" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Code editor */}
            <div className={clsx('min-h-0 overflow-hidden', isMobile ? 'h-1/2 border-b border-ide-border' : 'w-1/2 border-r border-ide-border')}>
              <CodeEditor
                height="100%"
                language={selectedLang === 'tsx' ? 'typescript' : selectedLang === 'jsx' ? 'javascript' : selectedLang}
                value={code}
                theme={themeMap[theme] || 'vs-dark'}
                beforeMount={(monaco) => { monacoRef.current = monaco; }}
                onMount={(editor) => { editorRef.current = editor; }}
                onChange={(val) => setCode(val || '')}
                options={{
                  fontSize,
                  fontFamily: 'JetBrains Mono, Fira Code, monospace',
                  fontLigatures: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  automaticLayout: true,
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                  padding: { top: 12, bottom: 12 },
                  wordWrap: 'on',
                  bracketPairColorization: { enabled: true },
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            </div>

            {/* Live preview */}
            <div className={clsx('min-h-0 overflow-hidden', isMobile ? 'h-1/2' : 'w-1/2')}>
              <LivePreview code={code} language={selectedLang} autoUpdate={true} />
            </div>
          </div>
        )}

        {/* Text output (for non-preview languages) */}
        {(viewMode === 'code' || !hasPreview) && (outputLines.length > 0 || isRunning) && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-ide-border bg-ide-bg flex flex-col max-h-[40%] shrink-0">
            <div className="flex items-center justify-between px-3 py-1.5 bg-ide-surface/50 border-b border-ide-border">
              <span className="text-[10px] font-semibold text-ide-muted uppercase tracking-wide">Output</span>
              {isRunning && <span className="text-[10px] text-ide-accent flex items-center gap-1"><Loader2 size={10} className="animate-spin" />{runStatus}</span>}
              {!isRunning && runStatus && <span className="text-[10px] text-ide-muted">{runStatus}</span>}
            </div>
            <div className="overflow-y-auto p-2 font-mono text-xs max-h-32">
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
        )}
      </div>
    </div>
  );
}
