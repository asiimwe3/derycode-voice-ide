import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';
import { X, FilePlus, FolderPlus, Play, Terminal as TerminalIcon, Palette, Settings, Code2, FileText } from 'lucide-react';
import { FileTree } from '@/components/FileTree';
import { useState } from 'react';

const THEMES = [
  { id: 'dark', label: 'Dark', color: '#1e1e2e' },
  { id: 'light', label: 'Light', color: '#eff1f5' },
  { id: 'midnight', label: 'Midnight', color: '#0f0f1e' },
  { id: 'solarized', label: 'Solarized', color: '#002b36' },
] as const;

export function SideDrawer() {
  const open = useIDEStore(s => s.sideDrawerOpen);
  const setOpen = useIDEStore(s => s.setSideDrawerOpen);
  const setMobilePanel = useIDEStore(s => s.setMobilePanel);
  const createFile = useIDEStore(s => s.createFile);
  const createFolder = useIDEStore(s => s.createFolder);
  const setTheme = useIDEStore(s => s.setTheme);
  const theme = useIDEStore(s => s.theme);
  const setSettingsOpen = useIDEStore(s => s.setSettingsOpen);
  const files = useIDEStore(s => s.files);
  const [newFileMode, setNewFileMode] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  if (!open) return null;

  const goTo = (panel: 'editor' | 'files' | 'terminal' | 'output' | 'playground' | 'settings') => {
    setMobilePanel(panel);
    setOpen(false);
  };

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      const path = newFileName.startsWith('/') ? newFileName : `/${newFileName}`;
      createFile(path);
      setNewFileName('');
      setNewFileMode(false);
      goTo('editor');
    }
  };

  const fileCount = files.filter(f => f.type === 'file').length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 modal-backdrop md:hidden"
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[80vw] bg-ide-bg border-r border-ide-border flex flex-col md:hidden animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-ide-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-ide-accent to-purple-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">D</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-ide-text">Derycode</div>
              <div className="text-[10px] text-ide-muted">{fileCount} files</div>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-ide-muted hover:text-ide-text p-2">
            <X size={20} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="p-3 border-b border-ide-border shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => goTo('playground')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-ide-accent/10 text-ide-accent text-xs font-medium hover:bg-ide-accent/20 transition-colors"
            >
              <Code2 size={14} />
              Playground
            </button>
            <button
              onClick={() => goTo('editor')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-ide-surface text-ide-text text-xs font-medium hover:bg-ide-surface-hover transition-colors"
            >
              <FileText size={14} />
              Editor
            </button>
            <button
              onClick={() => goTo('terminal')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-ide-surface text-ide-text text-xs font-medium hover:bg-ide-surface-hover transition-colors"
            >
              <TerminalIcon size={14} />
              Terminal
            </button>
            <button
              onClick={() => goTo('output')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-ide-surface text-ide-text text-xs font-medium hover:bg-ide-surface-hover transition-colors"
            >
              <Play size={14} />
              Output
            </button>
          </div>

          {/* New file input */}
          {newFileMode ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                autoFocus
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                onBlur={() => { if (!newFileName) setNewFileMode(false); }}
                className="flex-1 bg-ide-bg border border-ide-accent rounded px-2 py-1.5 text-xs text-ide-text outline-none"
                placeholder="filename.js"
              />
              <button
                onClick={handleCreateFile}
                className="text-xs text-ide-accent hover:text-ide-accent-hover font-medium"
              >
                Add
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setNewFileMode(true)}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-ide-surface text-ide-text text-xs font-medium hover:bg-ide-surface-hover transition-colors"
              >
                <FilePlus size={14} />
                New File
              </button>
              <button
                onClick={() => createFolder(`/new-folder-${Date.now()}`)}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-ide-surface text-ide-text text-xs font-medium hover:bg-ide-surface-hover transition-colors"
              >
                <FolderPlus size={14} />
                New Folder
              </button>
            </div>
          )}
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-2 text-[10px] font-semibold text-ide-muted uppercase tracking-wide border-b border-ide-border">
            Files
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileTree />
          </div>
        </div>

        {/* Theme selector */}
        <div className="p-3 border-t border-ide-border shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Palette size={12} className="text-ide-muted" />
            <span className="text-[10px] font-semibold text-ide-muted uppercase tracking-wide">Theme</span>
          </div>
          <div className="flex items-center gap-2">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all',
                  theme === t.id
                    ? 'bg-ide-accent/20 text-ide-accent ring-1 ring-ide-accent/50'
                    : 'text-ide-muted hover:text-ide-text'
                )}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="p-3 border-t border-ide-border shrink-0">
          <button
            onClick={() => { setSettingsOpen(true); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-ide-text text-xs font-medium hover:bg-ide-surface-hover transition-colors"
          >
            <Settings size={14} />
            Settings
          </button>
        </div>
      </div>
    </>
  );
}
