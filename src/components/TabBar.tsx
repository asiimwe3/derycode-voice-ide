import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';

export function TabBar() {
  const openTabs = useIDEStore((s) => s.openTabs);
  const activeTab = useIDEStore((s) => s.activeTab);
  const setActiveTab = useIDEStore((s) => s.setActiveTab);
  const closeTab = useIDEStore((s) => s.closeTab);

  if (openTabs.length === 0) return null;

  return (
    <div className="flex items-center bg-ide-surface border-b border-ide-border h-9 overflow-x-auto">
      {openTabs.map((tab) => (
        <div
          key={tab.path}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer border-r border-ide-border transition-colors group',
            activeTab === tab.path
              ? 'bg-ide-bg text-ide-accent'
              : 'text-ide-muted hover:bg-ide-bg/50'
          )}
          onClick={() => setActiveTab(tab.path)}
        >
          <span className="truncate max-w-[120px]">{tab.name}</span>
          {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-ide-accent" />}
          <button
            className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.path);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
