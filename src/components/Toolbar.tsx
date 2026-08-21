import { Mic, MicOff, PanelLeft, Terminal as TerminalIcon, Search, Settings, Command, Save } from 'lucide-react';
import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';

interface ToolbarProps {
  isListening: boolean;
  onToggleVoice: () => void;
}

export function Toolbar({ isListening, onToggleVoice }: ToolbarProps) {
  const sidebarVisible = useIDEStore(s => s.sidebarVisible);
  const toggleSidebar = useIDEStore(s => s.toggleSidebar);
  const toggleTerminal = useIDEStore(s => s.toggleTerminal);
  const terminalVisible = useIDEStore(s => s.terminalVisible);
  const setCommandPaletteOpen = useIDEStore(s => s.setCommandPaletteOpen);
  const setSettingsOpen = useIDEStore(s => s.setSettingsOpen);
  const activeTab = useIDEStore(s => s.activeTab);
  const saveFile = useIDEStore(s => s.saveFile);

  return (
    <div className="flex items-center justify-between px-3 h-11 bg-ide-surface border-b border-ide-border shrink-0">
      <div className="flex items-center gap-3">
        <button
          className={clsx('text-ide-muted hover:text-ide-text transition-colors', !sidebarVisible && 'text-ide-accent')}
          onClick={toggleSidebar}
          title="Toggle sidebar"
        >
          <PanelLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-ide-accent to-purple-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">D</span>
          </div>
          <span className="text-sm font-semibold text-ide-text">Derycode</span>
          <span className="text-xs text-ide-muted">Voice IDE</span>
        </div>
      </div>

      <div className="flex-1 flex justify-center px-4">
        <button
          className="flex items-center gap-2 bg-ide-bg border border-ide-border rounded-md px-3 py-1 text-xs text-ide-muted hover:border-ide-accent transition-colors w-full max-w-xs"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Command size={12} />
          <span>Search commands...</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {activeTab && (
          <button
            className="text-ide-muted hover:text-ide-text transition-colors p-1"
            onClick={() => saveFile(activeTab)}
            title="Save (Ctrl+S)"
          >
            <Save size={16} />
          </button>
        )}
        <button
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all',
            isListening
              ? 'bg-ide-danger/20 text-ide-danger'
              : 'bg-ide-accent/20 text-ide-accent hover:bg-ide-accent/30'
          )}
          onClick={onToggleVoice}
          title={isListening ? 'Stop listening' : 'Start voice control'}
        >
          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          {isListening ? 'Listening' : 'Voice'}
        </button>
        <button
          className={clsx('text-ide-muted hover:text-ide-text transition-colors p-1', terminalVisible && 'text-ide-accent')}
          onClick={toggleTerminal}
          title="Toggle terminal"
        >
          <TerminalIcon size={16} />
        </button>
        <button
          className="text-ide-muted hover:text-ide-text transition-colors p-1"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}

export function VoiceOverlay({ isListening, voiceTranscript, voiceFeedback }: {
  isListening: boolean;
  voiceTranscript: string;
  voiceFeedback: string;
}) {
  if (!isListening && !voiceTranscript && !voiceFeedback) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 pointer-events-none">
      {voiceTranscript && (
        <div className="bg-ide-surface border border-ide-border rounded-lg px-4 py-2 max-w-md animate-fade-in">
          <p className="text-sm text-ide-text">{voiceTranscript}</p>
        </div>
      )}
      {voiceFeedback && (
        <div className="bg-ide-surface/80 border border-ide-accent/30 rounded-lg px-3 py-1 max-w-md animate-fade-in">
          <p className="text-xs text-ide-accent">{voiceFeedback}</p>
        </div>
      )}
      {isListening && (
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-ide-danger/30 animate-pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-ide-danger/30 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
          <div className="relative w-12 h-12 rounded-full bg-ide-danger/40 flex items-center justify-center">
            <Mic size={20} className="text-red-300" />
          </div>
        </div>
      )}
    </div>
  );
}
