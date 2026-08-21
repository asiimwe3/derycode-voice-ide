import { useCallback } from 'react';
import { useIDEStore } from '@/hooks/useIDEStore';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoiceCommand, speak } from '@/lib/voiceCommands';
import { FileTree } from '@/components/FileTree';
import { CodeEditor } from '@/components/CodeEditor';
import { TabBar } from '@/components/TabBar';
import { Toolbar, VoiceOverlay } from '@/components/Toolbar';
import { StatusBar } from '@/components/StatusBar';
import { Terminal } from '@/components/Terminal';
import { clsx } from 'clsx';

export default function IDE() {
  const sidebarVisible = useIDEStore((s) => s.sidebarVisible);
  const terminalVisible = useIDEStore((s) => s.terminalVisible);
  const setListening = useIDEStore((s) => s.setListening);
  const voiceTranscript = useIDEStore((s) => s.voiceTranscript);
  const setVoiceTranscript = useIDEStore((s) => s.setVoiceTranscript);
  const openFile = useIDEStore((s) => s.openFile);

  const handleVoiceResult = useCallback(
    ({ transcript, isFinal }: { transcript: string; isFinal: boolean }) => {
      setVoiceTranscript(transcript);

      if (isFinal) {
        const command = parseVoiceCommand(transcript);
        if (command) {
          const match = transcript.match(command.patterns[0]);
          command.execute(match!, transcript);
        } else {
          speak("I didn't catch that. Try: open file, create file, go to line, toggle terminal.");
        }

        // Clear transcript after processing
        setTimeout(() => setVoiceTranscript(''), 2000);
      }
    },
    [setVoiceTranscript]
  );

  const { isListening, toggle } = useVoiceRecognition(handleVoiceResult);

  // Sync listening state with store
  if (isListening !== useIDEStore.getState().isListening) {
    setListening(isListening);
  }

  // Open the welcome file on first load
  if (useIDEStore.getState().openTabs.length === 0) {
    openFile('/src/index.tsx');
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ide-bg">
      <Toolbar isListening={isListening} onToggleVoice={toggle} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarVisible && (
          <div className="w-56 bg-ide-bg border-r border-ide-border flex flex-col">
            <div className="px-3 py-2 text-xs font-semibold text-ide-muted uppercase tracking-wide border-b border-ide-border">
              Explorer
            </div>
            <FileTree />
          </div>
        )}

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar />
          <div className="flex-1 overflow-hidden">
            <CodeEditor />
          </div>

          {/* Terminal panel */}
          {terminalVisible && (
            <div className="h-48 border-t border-ide-border bg-ide-bg">
              <div className="px-3 py-1.5 text-xs font-semibold text-ide-muted uppercase tracking-wide border-b border-ide-border">
                Terminal
              </div>
              <div className="h-[calc(100%-2rem)]">
                <Terminal />
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusBar />
      <VoiceOverlay isListening={isListening} voiceTranscript={voiceTranscript} />
    </div>
  );
}
