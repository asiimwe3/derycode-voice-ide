import { useIDEStore } from '@/hooks/useIDEStore';

export function StatusBar() {
  const activeTab = useIDEStore((s) => s.activeTab);
  const openTabs = useIDEStore((s) => s.openTabs);
  const isListening = useIDEStore((s) => s.isListening);

  const currentTab = openTabs.find((t) => t.path === activeTab);

  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
      json: 'JSON', md: 'Markdown', css: 'CSS', html: 'HTML',
      py: 'Python', go: 'Go', rs: 'Rust', java: 'Java',
    };
    return map[ext] || 'Plain Text';
  };

  return (
    <div className="flex items-center justify-between h-7 px-3 bg-ide-accent/10 border-t border-ide-border text-xs text-ide-muted">
      <div className="flex items-center gap-3">
        <span className={isListening ? 'text-red-400' : 'text-ide-muted'}>
          {isListening ? '● Listening' : '○ Idle'}
        </span>
        {currentTab && <span>{getLanguage(currentTab.name)}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span>{openTabs.length} open tab{openTabs.length !== 1 ? 's' : ''}</span>
        <span>UTF-8</span>
        <span>LF</span>
      </div>
    </div>
  );
}
