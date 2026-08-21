import { useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import { useIDEStore } from '@/hooks/useIDEStore';

const themeMap: Record<string, string> = {
  dark: 'derycode-dark',
  light: 'derycode-light',
  midnight: 'derycode-midnight',
  solarized: 'derycode-solarized',
};

const themeColors: Record<string, any> = {
  'derycode-dark': { bg: '#1e1e2e', fg: '#cdd6f4', muted: '#45475a', accent: '#89b4fa' },
  'derycode-light': { bg: '#eff1f5', fg: '#4c4f69', muted: '#bcc0cc', accent: '#1e66f5' },
  'derycode-midnight': { bg: '#0f0f1e', fg: '#e0e0f0', muted: '#2d2d4a', accent: '#7c83ff' },
  'derycode-solarized': { bg: '#002b36', fg: '#93a1a1', muted: '#0a4350', accent: '#268bd2' },
};

export function CodeEditor() {
  const activeTab = useIDEStore(s => s.activeTab);
  const openTabs = useIDEStore(s => s.openTabs);
  const updateFileContent = useIDEStore(s => s.updateFileContent);
  const theme = useIDEStore(s => s.theme);
  const minimapVisible = useIDEStore(s => s.minimapVisible);
  const fontSize = useIDEStore(s => s.fontSize);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const currentTab = openTabs.find(t => t.path === activeTab);

  const defineThemes = useCallback((monaco: any) => {
    Object.entries(themeColors).forEach(([themeName, colors]) => {
      monaco.editor.defineTheme(themeName, {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': colors.bg,
          'editor.foreground': colors.fg,
          'editorLineNumber.foreground': colors.muted,
          'editorLineNumber.activeForeground': colors.accent,
          'editor.selectionBackground': colors.muted,
          'editor.lineHighlightBackground': colors.bg,
          'editorCursor.foreground': colors.accent,
          'editorWidget.background': colors.bg,
          'editorWidget.border': colors.muted,
          'editorSuggestWidget.background': colors.bg,
          'editorHoverWidget.background': colors.bg,
          'input.background': colors.bg,
          'input.border': colors.muted,
        },
      });
    });
  }, []);

  const handleBeforeMount: BeforeMount = (monaco) => {
    defineThemes(monaco);
    monacoRef.current = monaco;
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  // Handle voice navigation events
  useEffect(() => {
    const gotoLine = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (editorRef.current && detail?.line) {
        editorRef.current.revealLineInCenter(detail.line);
        editorRef.current.setPosition({ lineNumber: detail.line, column: 1 });
        editorRef.current.focus();
      }
    };
    const gotoEnd = () => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          const lastLine = model.getLineCount();
          editorRef.current.revealLine(lastLine);
          editorRef.current.setPosition({ lineNumber: lastLine, column: 1 });
          editorRef.current.focus();
        }
      }
    };
    const gotoTop = () => {
      if (editorRef.current) {
        editorRef.current.revealLine(1);
        editorRef.current.setPosition({ lineNumber: 1, column: 1 });
        editorRef.current.focus();
      }
    };
    const format = () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.formatDocument')?.run();
      }
    };
    const undo = () => editorRef.current?.trigger('voice', 'undo', {});
    const redo = () => editorRef.current?.trigger('voice', 'redo', {});

    window.addEventListener('ide:goto-line', gotoLine);
    window.addEventListener('ide:goto-end', gotoEnd);
    window.addEventListener('ide:goto-top', gotoTop);
    window.addEventListener('ide:format', format);
    window.addEventListener('ide:undo', undo);
    window.addEventListener('ide:redo', redo);

    return () => {
      window.removeEventListener('ide:goto-line', gotoLine);
      window.removeEventListener('ide:goto-end', gotoEnd);
      window.removeEventListener('ide:goto-top', gotoTop);
      window.removeEventListener('ide:format', format);
      window.removeEventListener('ide:undo', undo);
      window.removeEventListener('ide:redo', redo);
    };
  }, []);

  if (!currentTab) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="text-ide-muted text-sm">No file open</div>
        <div className="text-ide-muted text-xs">Open a file from the sidebar, or say "open file" to begin</div>
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={currentTab.language}
      value={currentTab.content}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      theme={themeMap[theme] || 'derycode-dark'}
      onChange={(value) => {
        if (activeTab && value !== undefined) {
          updateFileContent(activeTab, value);
        }
      }}
      options={{
        fontSize,
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontLigatures: true,
        minimap: { enabled: minimapVisible },
        scrollBeyondLastLine: false,
        tabSize: 2,
        automaticLayout: true,
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
        wordWrap: 'on',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        suggestOnTriggerCharacters: true,
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}
