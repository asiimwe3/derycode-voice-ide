import { useState, useEffect, useRef } from 'react';
import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';
import { Search, X } from 'lucide-react';

interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const open = useIDEStore(s => s.commandPaletteOpen);
  const setOpen = useIDEStore(s => s.setCommandPaletteOpen);
  const files = useIDEStore(s => s.files);
  const openFile = useIDEStore(s => s.openFile);
  const toggleSidebar = useIDEStore(s => s.toggleSidebar);
  const toggleTerminal = useIDEStore(s => s.toggleTerminal);
  const toggleMinimap = useIDEStore(s => s.toggleMinimap);
  const setSettingsOpen = useIDEStore(s => s.setSettingsOpen);
  const setTheme = useIDEStore(s => s.setTheme);
  const saveFile = useIDEStore(s => s.saveFile);
  const activeTab = useIDEStore(s => s.activeTab);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const commands: PaletteCommand[] = [
    { id: 'toggle-sidebar', label: 'Toggle Sidebar', hint: 'View', action: toggleSidebar, keywords: ['sidebar', 'panel'] },
    { id: 'toggle-terminal', label: 'Toggle Terminal', hint: 'View', action: toggleTerminal, keywords: ['terminal', 'console'] },
    { id: 'toggle-minimap', label: 'Toggle Minimap', hint: 'View', action: toggleMinimap, keywords: ['minimap', 'map'] },
    { id: 'settings', label: 'Open Settings', hint: 'File', action: () => setSettingsOpen(true), keywords: ['settings', 'preferences'] },
    { id: 'save', label: 'Save File', hint: 'Ctrl+S', action: () => activeTab && saveFile(activeTab), keywords: ['save', 'write'] },
    { id: 'theme-dark', label: 'Theme: Dark', hint: 'Appearance', action: () => setTheme('dark'), keywords: ['theme', 'dark'] },
    { id: 'theme-light', label: 'Theme: Light', hint: 'Appearance', action: () => setTheme('light'), keywords: ['theme', 'light'] },
    { id: 'theme-midnight', label: 'Theme: Midnight', hint: 'Appearance', action: () => setTheme('midnight'), keywords: ['theme', 'midnight'] },
    { id: 'theme-solarized', label: 'Theme: Solarized', hint: 'Appearance', action: () => setTheme('solarized'), keywords: ['theme', 'solarized'] },
  ];

  // Add file open commands
  const fileCommands: PaletteCommand[] = files
    .filter(f => f.type === 'file')
    .map(f => ({
      id: `file-${f.path}`,
      label: `Open ${f.name}`,
      hint: f.path,
      action: () => openFile(f.path),
      keywords: [f.name, f.path],
    }));

  const allCommands = [...commands, ...fileCommands];
  const filtered = allCommands.filter(cmd => {
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selected];
      if (cmd) {
        cmd.action();
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 cmd-palette-backdrop" onClick={() => setOpen(false)} />
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg animate-slide-up">
        <div className="bg-ide-surface border border-ide-border rounded-lg shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-ide-border">
            <Search size={16} className="text-ide-muted" />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent outline-none text-sm text-ide-text placeholder:text-ide-muted"
              placeholder="Search files and commands..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
              onKeyDown={handleKeyDown}
            />
            <button onClick={() => setOpen(false)} className="text-ide-muted hover:text-ide-text">
              <X size={14} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-ide-muted">No results found</div>
            )}
            {filtered.map((cmd, i) => (
              <div
                key={cmd.id}
                className={clsx(
                  'flex items-center justify-between px-3 py-2 cursor-pointer text-sm',
                  i === selected ? 'bg-ide-accent/20 text-ide-accent' : 'text-ide-text hover:bg-ide-surface-hover/50'
                )}
                onMouseEnter={() => setSelected(i)}
                onClick={() => { cmd.action(); setOpen(false); }}
              >
                <span>{cmd.label}</span>
                {cmd.hint && <span className="text-xs text-ide-muted">{cmd.hint}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
