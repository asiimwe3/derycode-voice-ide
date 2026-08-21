import { useIDEStore, ThemeName } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';
import { X, Palette, Type } from 'lucide-react';

const themes: { id: ThemeName; label: string; colors: string[] }[] = [
  { id: 'dark', label: 'Dark (Catppuccin)', colors: ['#1e1e2e', '#313244', '#89b4fa', '#cdd6f4'] },
  { id: 'light', label: 'Light (Latte)', colors: ['#eff1f5', '#dce0e8', '#1e66f5', '#4c4f69'] },
  { id: 'midnight', label: 'Midnight', colors: ['#0f0f1e', '#1a1a2e', '#7c83ff', '#e0e0f0'] },
  { id: 'solarized', label: 'Solarized', colors: ['#002b36', '#073642', '#268bd2', '#93a1a1'] },
];

export function SettingsPanel() {
  const open = useIDEStore(s => s.settingsOpen);
  const setOpen = useIDEStore(s => s.setSettingsOpen);
  const theme = useIDEStore(s => s.theme);
  const setTheme = useIDEStore(s => s.setTheme);
  const fontSize = useIDEStore(s => s.fontSize);
  const setFontSize = useIDEStore(s => s.setFontSize);
  const minimapVisible = useIDEStore(s => s.minimapVisible);
  const toggleMinimap = useIDEStore(s => s.toggleMinimap);
  const mobilePanel = useIDEStore(s => s.mobilePanel);

  const isMobileInline = mobilePanel === 'settings';

  if (!open && !isMobileInline) return null;

  const content = (
    <div className={clsx('bg-ide-surface', isMobileInline && 'h-full overflow-y-auto')}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-ide-border sticky top-0 bg-ide-surface z-10">
        <h2 className="text-sm font-semibold text-ide-text">Settings</h2>
        {!isMobileInline && (
          <button onClick={() => setOpen(false)} className="text-ide-muted hover:text-ide-text">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Theme */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={14} className="text-ide-muted" />
            <h3 className="text-xs font-semibold text-ide-muted uppercase tracking-wide">Theme</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {themes.map(t => (
              <button
                key={t.id}
                className={clsx(
                  'flex items-center gap-2 p-2 rounded-lg border transition-all text-left',
                  theme === t.id
                    ? 'border-ide-accent bg-ide-accent/10'
                    : 'border-ide-border hover:border-ide-muted'
                )}
                onClick={() => setTheme(t.id)}
              >
                <div className="flex gap-1">
                  {t.colors.map((c, i) => (
                    <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                  ))}
                </div>
                <span className="text-xs text-ide-text">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Font size */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Type size={14} className="text-ide-muted" />
            <h3 className="text-xs font-semibold text-ide-muted uppercase tracking-wide">Font Size</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 rounded-lg border border-ide-border hover:bg-ide-surface-hover flex items-center justify-center text-ide-text"
              onClick={() => setFontSize(Math.max(8, fontSize - 2))}
            >
              −
            </button>
            <span className="text-sm text-ide-text w-12 text-center">{fontSize}px</span>
            <button
              className="w-8 h-8 rounded-lg border border-ide-border hover:bg-ide-surface-hover flex items-center justify-center text-ide-text"
              onClick={() => setFontSize(Math.min(32, fontSize + 2))}
            >
              +
            </button>
          </div>
        </section>

        {/* Editor options */}
        <section>
          <h3 className="text-xs font-semibold text-ide-muted uppercase tracking-wide mb-3">Editor</h3>
          <label className="flex items-center justify-between cursor-pointer py-2">
            <span className="text-sm text-ide-text">Show Minimap</span>
            <button
              className={clsx(
                'w-10 h-5 rounded-full transition-colors relative',
                minimapVisible ? 'bg-ide-accent' : 'bg-ide-border'
              )}
              onClick={toggleMinimap}
            >
              <div className={clsx(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                minimapVisible ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </label>
        </section>

        {/* About */}
        <section className="pt-4 border-t border-ide-border">
          <p className="text-xs text-ide-muted">
            Derycode Voice IDE v0.3.0 — Built with Next.js, Monaco Editor, and the Web Speech API.
          </p>
          <p className="text-xs text-ide-muted mt-2">
            In-browser compiler supports JavaScript, TypeScript, Python, HTML, CSS, and JSON.
          </p>
        </section>
      </div>
    </div>
  );

  if (isMobileInline) {
    return content;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 modal-backdrop" onClick={() => setOpen(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md animate-slide-up">
        <div className="bg-ide-surface border border-ide-border rounded-xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto">
          {content}
        </div>
      </div>
    </>
  );
}
