import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export function TabBar() {
  const openTabs = useIDEStore(s => s.openTabs);
  const activeTab = useIDEStore(s => s.activeTab);
  const setActiveTab = useIDEStore(s => s.setActiveTab);
  const closeTab = useIDEStore(s => s.closeTab);
  const saveFile = useIDEStore(s => s.saveFile);

  if (openTabs.length === 0) return null;

  const getIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      ts: 'TS', tsx: 'TSX', js: 'JS', jsx: 'JSX', json: '{}', md: 'MD',
      css: '#', html: '<>', py: 'PY', go: 'GO', rs: 'RS', sh: '$',
    };
    return icons[ext || ''] || '📄';
  };

  return (
    <div className="flex items-center bg-ide-surface border-b border-ide-border h-9 overflow-x-auto">
      {openTabs.map(tab => (
        <div
          key={tab.path}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer border-r border-ide-border transition-colors group shrink-0',
            activeTab === tab.path
              ? 'bg-ide-bg text-ide-accent'
              : 'text-ide-muted hover:bg-ide-bg/50'
          )}
          onClick={() => setActiveTab(tab.path)}
          onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(tab.path); } }}
        >
          <span className="opacity-60 text-[10px] font-mono">{getIcon(tab.name)}</span>
          <span className="truncate max-w-[120px]">{tab.name}</span>
          {tab.dirty ? (
            <button
              className="text-ide-accent hover:text-ide-warning"
              onClick={(e) => { e.stopPropagation(); saveFile(tab.path); }}
              title="Save file"
            >
              ●
            </button>
          ) : null}
          <button
            className="opacity-0 group-hover:opacity-100 hover:text-ide-danger transition-opacity"
            onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
