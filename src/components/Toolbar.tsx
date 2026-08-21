import { Mic, MicOff, PanelLeft, Terminal as TerminalIcon } from 'lucide-react';
import { useIDEStore } from '@/hooks/useIDEStore';
import { clsx } from 'clsx';

interface VoiceOverlayProps {
  isListening: boolean;
  onToggleVoice: () => void;
}

export function Toolbar({ isListening, onToggleVoice }: VoiceOverlayProps) {
  const sidebarVisible = useIDEStore((s) => s.sidebarVisible);
  const toggleSidebar = useIDEStore((s) => s.toggleSidebar);
  const toggleTerminal = useIDEStore((s) => s.toggleTerminal);
  const terminalVisible = useIDEStore((s) => s.terminalVisible);

  return (
    <div className="flex items-center justify-between px-3 h-11 bg-ide-surface border-b border-ide-border">
      <div className="flex items-center gap-3">
        <button
          className="text-ide-muted hover:text-ide-text transition-colors"
          onClick={toggleSidebar}
          title="Toggle sidebar"
        >
          <PanelLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-ide-text">Derycode</span>
        <span className="text-xs text-ide-muted">Voice IDE</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all',
            isListening
              ? 'bg-red-500/20 text-red-400'
              : 'bg-ide-accent/20 text-ide-accent hover:bg-ide-accent/30'
          )}
          onClick={onToggleVoice}
          title={isListening ? 'Stop listening' : 'Start voice control'}
        >
          {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          {isListening ? 'Listening...' : 'Voice'}
        </button>

        <button
          className={clsx(
            'text-ide-muted hover:text-ide-text transition-colors p-1',
            terminalVisible && 'text-ide-accent'
          )}
          onClick={toggleTerminal}
          title="Toggle terminal"
        >
          <TerminalIcon size={16} />
        </button>
      </div>
    </div>
  );
}

export function VoiceOverlay({ isListening, voiceTranscript }: { isListening: boolean; voiceTranscript: string }) {
  if (!isListening) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      {voiceTranscript && (
        <div className="bg-ide-surface border border-ide-border rounded-lg px-4 py-2 max-w-md">
          <p className="text-sm text-ide-text">{voiceTranscript}</p>
        </div>
      )}
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-red-500/30 voice-ring" />
        <div className="absolute inset-0 rounded-full bg-red-500/30 voice-ring" style={{ animationDelay: '0.5s' }} />
        <div className="relative w-12 h-12 rounded-full bg-red-500/40 flex items-center justify-center">
          <Mic size={20} className="text-red-300" />
        </div>
      </div>
    </div>
  );
}
