import Editor, { OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import { useIDEStore } from '@/hooks/useIDEStore';

export function CodeEditor() {
  const activeTab = useIDEStore((s) => s.activeTab);
  const openTabs = useIDEStore((s) => s.openTabs);
  const updateFileContent = useIDEStore((s) => s.updateFileContent);
  const editorRef = useRef<any>(null);

  const currentTab = openTabs.find((t) => t.path === activeTab);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom theme
    monaco.editor.defineTheme('derycode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e2e',
        'editorLineNumber.foreground': '#45475a',
        'editorLineNumber.activeForeground': '#89b4fa',
        'editor.selectionBackground': '#45475a',
        'editor.lineHighlightBackground': '#313244',
        'editorCursor.foreground': '#89b4fa',
      },
    });
    monaco.editor.setTheme('derycode-dark');
  };

  // Listen for voice "go to line" commands
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (editorRef.current && detail?.line) {
        editorRef.current.revealLineInCenter(detail.line);
        editorRef.current.setPosition({ lineNumber: detail.line, column: 1 });
        editorRef.current.focus();
      }
    };
    window.addEventListener('ide:goto-line', handler);
    return () => window.removeEventListener('ide:goto-line', handler);
  }, []);

  if (!currentTab) {
    return (
      <div className="flex items-center justify-center h-full text-ide-muted text-sm">
        Select a file to start editing, or say "open file" to begin.
      </div>
    );
  }

  // Determine language from file extension
  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      sh: 'shell',
    };
    return map[ext || ''] || 'plaintext';
  };

  return (
    <Editor
      height="100%"
      language={getLanguage(currentTab.name)}
      value={currentTab.content}
      onMount={handleMount}
      onChange={(value) => {
        if (activeTab && value !== undefined) {
          updateFileContent(activeTab, value);
        }
      }}
      options={{
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
