import { useIDEStore, getLanguage } from '@/hooks/useIDEStore';

export function StatusBar() {
  const activeTab = useIDEStore(s => s.activeTab);
  const openTabs = useIDEStore(s => s.openTabs);
  const isListening = useIDEStore(s => s.isListening);
  const theme = useIDEStore(s => s.theme);
  const fontSize = useIDEStore(s => s.fontSize);
  const isRunning = useIDEStore(s => s.isRunning);
  const runStatus = useIDEStore(s => s.runStatus);

  const currentTab = openTabs.find(t => t.path === activeTab);
  const lang = currentTab ? getLanguage(currentTab.name) : '—';
  const dirtyCount = openTabs.filter(t => t.dirty).length;

  return (
    <div className="flex items-center justify-between h-6 px-2 sm:px-3 bg-ide-accent/10 border-t border-ide-border text-[10px] text-ide-muted shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={isListening ? 'text-ide-danger' : 'text-ide-muted'}>
          {isListening ? '● Listening' : '○ Idle'}
        </span>
        <span className="hidden sm:inline">{lang}</span>
        {isRunning && <span className="text-ide-accent">{runStatus}</span>}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {dirtyCount > 0 && <span className="text-ide-warning">{dirtyCount} unsaved</span>}
        <span className="hidden sm:inline">Theme: {theme}</span>
        <span className="hidden sm:inline">{openTabs.length} tab{openTabs.length !== 1 ? 's' : ''}</span>
        <span className="hidden sm:inline">{fontSize}px</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
