import { useState } from 'react';
import { clsx } from 'clsx';
import { Smartphone, Tablet, Monitor, Square } from 'lucide-react';

export interface Device {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: typeof Smartphone;
}

export const DEVICES: Device[] = [
  { id: 'responsive', label: 'Responsive', width: 0, height: 0, icon: Square },
  { id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667, icon: Smartphone },
  { id: 'iphone-14', label: 'iPhone 14', width: 390, height: 844, icon: Smartphone },
  { id: 'pixel-7', label: 'Pixel 7', width: 412, height: 915, icon: Smartphone },
  { id: 'ipad', label: 'iPad', width: 768, height: 1024, icon: Tablet },
  { id: 'ipad-pro', label: 'iPad Pro', width: 1024, height: 1366, icon: Tablet },
  { id: 'laptop', label: 'Laptop', width: 1280, height: 800, icon: Monitor },
  { id: 'desktop', label: 'Desktop', width: 1920, height: 1080, icon: Monitor },
];

interface DevicePreviewProps {
  selectedDevice: string;
  onDeviceChange: (id: string) => void;
  children: React.ReactNode;
}

export function DevicePreview({ selectedDevice, onDeviceChange, children }: DevicePreviewProps) {
  const [showDevices, setShowDevices] = useState(false);
  const device = DEVICES.find(d => d.id === selectedDevice) || DEVICES[0];
  const Icon = device.icon;

  const isResponsive = device.id === 'responsive';

  return (
    <div className="flex flex-col h-full">
      {/* Device toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-ide-surface border-b border-ide-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowDevices(!showDevices)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-ide-text bg-ide-bg border border-ide-border hover:border-ide-accent transition-colors"
            >
              <Icon size={12} className="text-ide-accent" />
              <span>{device.label}</span>
              {!isResponsive && (
                <span className="text-ide-muted text-[10px]">{device.width}×{device.height}</span>
              )}
            </button>
            {showDevices && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDevices(false)} />
                <div className="absolute top-full left-0 mt-1 z-20 bg-ide-surface border border-ide-border rounded-lg shadow-xl py-1 min-w-[160px]">
                  {DEVICES.map(d => {
                    const DIcon = d.icon;
                    return (
                      <button
                        key={d.id}
                        onClick={() => { onDeviceChange(d.id); setShowDevices(false); }}
                        className={clsx(
                          'w-full flex items-center gap-2 px-3 py-2 hover:bg-ide-surface-hover/50 transition-colors text-left',
                          selectedDevice === d.id ? 'text-ide-accent' : 'text-ide-text'
                        )}
                      >
                        <DIcon size={12} />
                        <div>
                          <div className="text-xs font-medium">{d.label}</div>
                          {d.width > 0 && (
                            <div className="text-[10px] text-ide-muted">{d.width}×{d.height}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          {!isResponsive && (
            <span className="text-[10px] text-ide-muted">Scaled to fit</span>
          )}
        </div>
        {isResponsive && (
          <span className="text-[10px] text-ide-muted">Fills available space</span>
        )}
      </div>

      {/* Preview area with device frame */}
      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-4 bg-ide-bg">
        {isResponsive ? (
          <div className="w-full h-full">
            {children}
          </div>
        ) : (
          <div
            className="bg-white shadow-2xl rounded-[24px] overflow-hidden border-[8px] border-gray-800 relative"
            style={{
              width: device.width,
              maxWidth: '100%',
              height: device.height,
              maxHeight: '100%',
              transform: 'scale(min(1, calc(100% / max(' + device.width + ', ' + device.height + '))))',
              transformOrigin: 'top center',
            }}
          >
            {/* Notch for phones */}
            {(device.id === 'iphone-14' || device.id === 'pixel-7') && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-800 rounded-b-2xl z-10" />
            )}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
