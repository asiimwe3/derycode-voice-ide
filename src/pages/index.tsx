import { useEffect, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useIDEStore } from '@/hooks/useIDEStore';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoiceCommand, speak } from '@/lib/voiceCommands';
import { FileTree } from '@/components/FileTree';
import { TabBar } from '@/components/TabBar';
import { Toolbar, VoiceOverlay } from '@/components/Toolbar';
import { StatusBar } from '@/components/StatusBar';
import { CommandPalette } from '@/components/CommandPalette';
import { SettingsPanel } from '@/components/SettingsPanel';
import { clsx } from 'clsx';

// Dynamically import Monaco Editor (no SSR) and Terminal to avoid SSR issues
const CodeEditor = dynamic(() => import('@/components/CodeEditor').then(m => m.CodeEditor), { ssr: false });
const Terminal = dynamic(() => import('@/components/Terminal').then(m => m.Terminal), { ssr: false });

export default function IDE() {
  const sidebarVisible = useIDEStore(s => s.sidebarVisible);
  const terminalVisible = useIDEStore(s => s.terminalVisible);
  const setListening = useIDEStore(s => s.setListening);
  const voiceTranscript = useIDEStore(s => s.voiceTranscript);
  const voiceFeedback = useIDEStore(s => s.voiceFeedback);
  const setVoiceTranscript = useIDEStore(s => s.setVoiceTranscript);
  const loadFiles = useIDEStore(s => s.loadFiles);
  const openFile = useIDEStore(s => s.openFile);
  const setCommandPaletteOpen = useIDEStore(s => s.setCommandPaletteOpen);
  const activeTab = useIDEStore(s => s.activeTab);
  const saveFile = useIDEStore(s => s.saveFile);
  const openTabs = useIDEStore(s => s.openTabs);
  const setTheme = useIDEStore(s => s.setTheme);
  const [initialized, setInitialized] = useState(false);

  // Load files from IndexedDB on mount
  useEffect(() => {
    if (!initialized) {
      loadFiles().then(() => {
        // Load saved theme
        import('@/lib/fileSystem').then(({ fileSystem }) => {
          fileSystem.getSetting('theme').then(savedTheme => {
            if (savedTheme) setTheme(savedTheme);
          });
        });
        setInitialized(true);
      });
    }
  }, [initialized, loadFiles, setTheme]);

  // Open the welcome file after load
  useEffect(() => {
    if (initialized && openTabs.length === 0) {
      const state = useIDEStore.getState();
      const welcomeFile = state.files.find(f => f.path === '/src/index.tsx');
      if (welcomeFile) openFile(welcomeFile.path);
      else {
        const firstFile = state.files.find(f => f.type === 'file');
        if (firstFile) openFile(firstFile.path);
      }
    }
  }, [initialized, openTabs.length, openFile]);

  // Voice command handling
  const handleVoiceResult = useCallback(({ transcript, isFinal }: { transcript: string; isFinal: boolean }) => {
    setVoiceTranscript(transcript);

    if (isFinal) {
      const command = parseVoiceCommand(transcript);
      if (command) {
        const match = transcript.match(command.patterns[0]);
        if (match) command.execute(match, transcript);
      } else {
        speak("I didn't catch that. Try: open file, create file, go to line, run build, toggle terminal.");
      }
      setTimeout(() => {
        useIDEStore.getState().setVoiceTranscript('');
        useIDEStore.getState().setVoiceFeedback('');
      }, 3000);
    }
  }, [setVoiceTranscript]);

  const { isListening, toggle } = useVoiceRecognition(handleVoiceResult);

  // Sync listening state with store
  useEffect(() => {
    setListening(isListening);
  }, [isListening, setListening]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K — Command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      // Ctrl+S / Cmd+S — Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab) saveFile(activeTab);
      }
      // Ctrl+B / Cmd+B — Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        useIDEStore.getState().toggleSidebar();
      }
      // Ctrl+` / Cmd+` — Toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        useIDEStore.getState().toggleTerminal();
      }
      // Ctrl+, / Cmd+, — Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        useIDEStore.getState().setSettingsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, saveFile, setCommandPaletteOpen]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-ide-bg">
      <Toolbar isListening={isListening} onToggleVoice={toggle} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarVisible && (
          <div className="w-56 bg-ide-bg border-r border-ide-border flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-ide-muted uppercase tracking-wide border-b border-ide-border">
              <span>Explorer</span>
              <span className="text-ide-muted">{useIDEStore.getState().files.filter(f => f.type === 'file').length} files</span>
            </div>
            <FileTree />
          </div>
        )}

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar />
          <div className="flex-1 overflow-hidden bg-ide-bg">
            <CodeEditor />
          </div>

          {/* Terminal panel */}
          {terminalVisible && (
            <div className="h-48 border-t border-ide-border bg-ide-bg flex flex-col shrink-0">
              <div className="flex items-center justify-between px-3 py-1 text-[10px] font-semibold text-ide-muted uppercase tracking-wide border-b border-ide-border">
                <span>Terminal</span>
                <span className="text-ide-muted">type "help" for commands</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <Terminal />
              </div>
            </div>
          )}
        </div>
      </div>

      <StatusBar />
      <VoiceOverlay isListening={isListening} voiceTranscript={voiceTranscript} voiceFeedback={voiceFeedback} />
      <CommandPalette />
      <SettingsPanel />
    </div>
  );
}
