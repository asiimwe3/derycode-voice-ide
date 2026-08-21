import { Mic, Folder, Code2, Terminal as TerminalIcon, SquareStack, Settings } from 'lucide-react';
import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';

interface BottomNavProps {
  isListening: boolean;
  onToggleVoice: () => void;
}

export function BottomNav({ isListening, onToggleVoice }: BottomNavProps) {
  const mobilePanel = useIDEStore(s => s.mobilePanel);
  const setMobilePanel = useIDEStore(s => s.setMobilePanel);
  const dirtyCount = useIDEStore(s => s.openTabs.filter(t => t.dirty).length);

  const items = [
    { id: 'files' as const, icon: Folder, label: 'Files' },
    { id: 'editor' as const, icon: Code2, label: 'Editor', badge: dirtyCount },
    { id: 'terminal' as const, icon: TerminalIcon, label: 'Terminal' },
    { id: 'output' as const, icon: SquareStack, label: 'Output' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex items-center justify-around bg-ide-surface border-t border-ide-border h-14 shrink-0 safe-bottom">
      {items.map(item => {
        const active = mobilePanel === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setMobilePanel(item.id)}
            className={clsx(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative',
              active ? 'text-ide-accent' : 'text-ide-muted'
            )}
          >
            <item.icon size={20} />
            <span className="text-[9px] font-medium">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className="absolute top-1 right-[28%] w-2 h-2 rounded-full bg-ide-warning" />
            ) : null}
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-ide-accent" />
            )}
          </button>
        );
      })}
      {/* Voice button - floating */}
      <button
        onClick={onToggleVoice}
        className={clsx(
          'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative',
          isListening ? 'text-ide-danger' : 'text-ide-accent'
        )}
      >
        <div className={clsx(
          'w-9 h-9 rounded-full flex items-center justify-center transition-all',
          isListening ? 'bg-ide-danger/30 animate-pulse' : 'bg-ide-accent/20'
        )}>
          <Mic size={18} />
        </div>
        <span className="text-[9px] font-medium">{isListening ? 'Listening' : 'Voice'}</span>
      </button>
    </div>
  );
}
