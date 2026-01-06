import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bot, BarChart3, FileText, Network, Info, MoreVertical } from 'lucide-react';
import { TooltipProvider, TooltipSimple } from '@/components/ui/tooltip-modern';
import { WindowControls } from '@/components/WindowControls';
import { detectOS, osToWindowControlStyle } from '@/lib/osDetector';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CustomTitlebarProps {
  onSettingsClick?: () => void;
  onAgentsClick?: () => void;
  onUsageClick?: () => void;
  onClaudeClick?: () => void;
  onMCPClick?: () => void;
  onInfoClick?: () => void;
}

export const CustomTitlebar: React.FC<CustomTitlebarProps> = ({
  onSettingsClick,
  onAgentsClick,
  onUsageClick,
  onClaudeClick,
  onMCPClick,
  onInfoClick
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [windowControlStyle, setWindowControlStyle] = useState<'macos' | 'windows' | 'linux'>('macos');

  // Detect OS and load window control style
  useEffect(() => {
    const loadStyle = async () => {
      try {
        const detectedOS = detectOS();
        const defaultStyle = osToWindowControlStyle(detectedOS);
        const savedStyle = await api.getSetting('window_control_style');
        if (savedStyle && savedStyle.trim() !== '' && ['macos', 'windows', 'linux'].includes(savedStyle)) {
          setWindowControlStyle(savedStyle as 'macos' | 'windows' | 'linux');
        } else {
          setWindowControlStyle(defaultStyle);
        }
      } catch (error) {
        console.error('Failed to load window control style:', error);
        const detectedOS = detectOS();
        setWindowControlStyle(osToWindowControlStyle(detectedOS));
      }
    };
    loadStyle();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine if we should show navigation icons on the left (Windows/Linux style)
  const isWindowsOrLinuxStyle = windowControlStyle === 'windows' || windowControlStyle === 'linux';

  // Navigation icons component - Simplified for terminal style
  const navigationIcons = (
    <>
      <div className="flex items-center gap-1">
        {onAgentsClick && (
          <TooltipSimple content="Agents" side="bottom">
            <motion.button
              onClick={onAgentsClick}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="p-2 rounded-lg hover:bg-accent/60 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 tauri-no-drag group"
            >
              <Bot size={16} className="transition-transform duration-200 group-hover:scale-110" />
            </motion.button>
          </TooltipSimple>
        )}

        {onUsageClick && (
          <TooltipSimple content="Usage" side="bottom">
            <motion.button
              onClick={onUsageClick}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="p-2 rounded-lg hover:bg-accent/60 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 tauri-no-drag group"
            >
              <BarChart3 size={16} className="transition-transform duration-200 group-hover:scale-110" />
            </motion.button>
          </TooltipSimple>
        )}
      </div>

      <div className="w-px h-4 bg-border/50 mx-1" />

      <div className="flex items-center gap-1">
        {onSettingsClick && (
          <TooltipSimple content="Settings" side="bottom">
            <motion.button
              onClick={onSettingsClick}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="p-2 rounded-lg hover:bg-accent/60 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 tauri-no-drag group"
            >
              <Settings size={16} className="transition-transform duration-200 group-hover:scale-110" />
            </motion.button>
          </TooltipSimple>
        )}

        <div className="relative" ref={dropdownRef}>
          <TooltipSimple content="More" side="bottom">
            <motion.button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="p-2 rounded-lg hover:bg-accent/60 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            >
              <MoreVertical size={16} className="transition-transform duration-200 group-hover:scale-110" />
            </motion.button>
          </TooltipSimple>

          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute mt-2 w-56 glass-card rounded-xl shadow-xl border border-border/50 z-[250]",
                isWindowsOrLinuxStyle ? "left-0" : "right-0"
              )}
            >
              <div className="py-2">
                {onClaudeClick && (
                  <button
                    onClick={() => {
                      onClaudeClick();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent/80 transition-all duration-150 flex items-center gap-3 group"
                  >
                    <FileText size={16} className="text-primary group-hover:scale-110 transition-transform duration-150" />
                    <span>CLAUDE.md</span>
                  </button>
                )}

                {onMCPClick && (
                  <button
                    onClick={() => {
                      onMCPClick();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent/80 transition-all duration-150 flex items-center gap-3 group"
                  >
                    <Network size={16} className="text-primary group-hover:scale-110 transition-transform duration-150" />
                    <span>MCP Servers</span>
                  </button>
                )}

                {onInfoClick && (
                  <button
                    onClick={() => {
                      onInfoClick();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent/80 transition-all duration-150 flex items-center gap-3 group"
                  >
                    <Info size={16} className="text-primary group-hover:scale-110 transition-transform duration-150" />
                    <span>About</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <TooltipProvider>
    <div
      className="relative z-[200] h-12 glass border-b border-border/30 flex items-center justify-between select-none tauri-drag"
      data-tauri-drag-region
    >
      {/* Left side */}
      <div className="flex items-center gap-2 tauri-no-drag pl-2">
        {/* macOS: Window Controls on left */}
        {!isWindowsOrLinuxStyle && <WindowControls position="left" />}

        {/* Windows/Linux: Navigation icons on left */}
        {isWindowsOrLinuxStyle && (
          <div className="flex items-center gap-1">
            {navigationIcons}
          </div>
        )}
      </div>

      {/* Center - Title with subtle gradient */}
      <div
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        data-tauri-drag-region
      >
        <span className="text-sm font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Claude Code
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 tauri-no-drag pr-2">
        {/* macOS: Navigation icons on right */}
        {!isWindowsOrLinuxStyle && (
          <div className="flex items-center gap-1">
            {navigationIcons}
          </div>
        )}

        {/* Windows/Linux: Window Controls on right */}
        {isWindowsOrLinuxStyle && (
          <WindowControls position="right" />
        )}
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
    </div>
    </TooltipProvider>
  );
};
