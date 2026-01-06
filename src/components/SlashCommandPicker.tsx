import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import {
  X,
  Command,
  Search,
  Globe,
  FolderOpen,
  Zap,
  FileCode,
  Terminal,
  AlertCircle,
  User,
  Building2,
  Clock,
  Star,
  ArrowRight,
  Info,
  Hash,
  Cpu,
  GitBranch,
  Play,
  Settings,
  Bug,
  Database,
  Cloud,
  Shield,
  Palette
} from "lucide-react";
import type { SlashCommand } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTrackEvent, useFeatureAdoptionTracking } from "@/hooks";

interface SlashCommandPickerProps {
  /**
   * The project path for loading project-specific commands
   */
  projectPath?: string;
  /**
   * Callback when a command is selected
   */
  onSelect: (command: SlashCommand) => void;
  /**
   * Callback to close the picker
   */
  onClose: () => void;
  /**
   * Initial search query (text after /)
   */
  initialQuery?: string;
  /**
   * Optional className for styling
   */
  className?: string;
}

// Get icon for command based on its properties
const getCommandIcon = (command: SlashCommand) => {
  // If it has bash commands, show terminal icon
  if (command.has_bash_commands) return Terminal;

  // If it has file references, show file icon
  if (command.has_file_references) return FileCode;

  // If it accepts arguments, show zap icon
  if (command.accepts_arguments) return Zap;

  // Based on scope
  if (command.scope === "project") return FolderOpen;
  if (command.scope === "user") return Globe;

  // Default
  return Command;
};

// Get category icon for better organization
const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('git') || lower.includes('branch') || lower.includes('commit')) return GitBranch;
  if (lower.includes('run') || lower.includes('execute') || lower.includes('start')) return Play;
  if (lower.includes('debug') || lower.includes('test') || lower.includes('error')) return Bug;
  if (lower.includes('file') || lower.includes('code') || lower.includes('edit')) return FileCode;
  if (lower.includes('config') || lower.includes('setting') || lower.includes('option')) return Settings;
  if (lower.includes('data') || lower.includes('db') || lower.includes('sql')) return Database;
  if (lower.includes('cloud') || lower.includes('deploy') || lower.includes('build')) return Cloud;
  if (lower.includes('secure') || lower.includes('auth') || lower.includes('token')) return Shield;
  if (lower.includes('style') || lower.includes('theme') || lower.includes('color')) return Palette;
  if (lower.includes('model') || lower.includes('ai') || lower.includes('claude')) return Cpu;
  return Hash;
};

/**
 * SlashCommandPicker component - Autocomplete UI for slash commands
 * 
 * @example
 * <SlashCommandPicker
 *   projectPath="/Users/example/project"
 *   onSelect={(command) => console.log('Selected:', command)}
 *   onClose={() => setShowPicker(false)}
 * />
 */
export const SlashCommandPicker: React.FC<SlashCommandPickerProps> = ({
  projectPath,
  onSelect,
  onClose,
  initialQuery = "",
  className,
}) => {
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<string>("custom");
  const [hoveredCommand, setHoveredCommand] = useState<SlashCommand | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const commandListRef = useRef<HTMLDivElement>(null);
  
  // Analytics tracking
  const trackEvent = useTrackEvent();
  const slashCommandFeatureTracking = useFeatureAdoptionTracking('slash_commands');
  
  // Load commands on mount or when project path changes
  useEffect(() => {
    loadCommands();
  }, [projectPath]);
  
  // Filter commands based on search query and active tab
  useEffect(() => {
    if (!commands.length) {
      setFilteredCommands([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    let filteredByTab: SlashCommand[];
    
    // Filter by active tab
    if (activeTab === "default") {
      // Show default/built-in commands
      filteredByTab = commands.filter(cmd => cmd.scope === "default");
    } else {
      // Show all custom commands (both user and project)
      filteredByTab = commands.filter(cmd => cmd.scope !== "default");
    }
    
    // Then filter by search query
    let filtered: SlashCommand[];
    if (!query) {
      filtered = filteredByTab;
    } else {
      filtered = filteredByTab.filter(cmd => {
        // Match against command name
        if (cmd.name.toLowerCase().includes(query)) return true;
        
        // Match against full command
        if (cmd.full_command.toLowerCase().includes(query)) return true;
        
        // Match against namespace
        if (cmd.namespace && cmd.namespace.toLowerCase().includes(query)) return true;
        
        // Match against description
        if (cmd.description && cmd.description.toLowerCase().includes(query)) return true;
        
        return false;
      });
      
      // Sort by relevance
      filtered.sort((a, b) => {
        // Exact name match first
        const aExact = a.name.toLowerCase() === query;
        const bExact = b.name.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then by name starts with
        const aStarts = a.name.toLowerCase().startsWith(query);
        const bStarts = b.name.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });
    }
    
    setFilteredCommands(filtered);
    
    // Reset selected index when filtered list changes
    setSelectedIndex(0);
  }, [searchQuery, commands, activeTab]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
          
        case 'Enter':
          e.preventDefault();
          if (filteredCommands.length > 0 && selectedIndex < filteredCommands.length) {
            const command = filteredCommands[selectedIndex];
            trackEvent.slashCommandSelected({
              command_name: command.name,
              selection_method: 'keyboard'
            });
            slashCommandFeatureTracking.trackUsage();
            onSelect(command);
          }
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(0, prev - 1));
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (commandListRef.current) {
      const selectedElement = commandListRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);
  
  const loadCommands = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Always load fresh commands from filesystem
      const loadedCommands = await api.slashCommandsList(projectPath);
      setCommands(loadedCommands);
    } catch (err) {
      console.error("Failed to load slash commands:", err);
      setError(err instanceof Error ? err.message : 'Failed to load commands');
      setCommands([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCommandClick = (command: SlashCommand) => {
    trackEvent.slashCommandSelected({
      command_name: command.name,
      selection_method: 'click'
    });
    slashCommandFeatureTracking.trackUsage();
    onSelect(command);
  };
  
  // Group commands by scope and namespace for the Custom tab
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    let key: string;
    if (cmd.scope === "user") {
      key = cmd.namespace ? `User Commands: ${cmd.namespace}` : "User Commands";
    } else if (cmd.scope === "project") {
      key = cmd.namespace ? `Project Commands: ${cmd.namespace}` : "Project Commands";
    } else {
      key = cmd.namespace || "Commands";
    }
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(cmd);
    return acc;
  }, {} as Record<string, SlashCommand[]>);
  
  // Update search query from parent
  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "absolute bottom-full mb-2 left-0 z-50",
        "flex flex-col overflow-hidden rounded-xl shadow-2xl",
        showPreview ? "w-[900px] h-[500px]" : "w-[600px] h-[400px]",
        "bg-background/95 backdrop-blur-xl border border-border/50",
        "ring-1 ring-black/5 dark:ring-white/5",
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-border/50 p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Command className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-semibold">Slash Commands</span>
              <div className="flex items-center gap-2 mt-0.5">
                {searchQuery && (
                  <span className="text-xs text-muted-foreground">
                    Searching: <span className="font-medium text-foreground">"{searchQuery}"</span>
                  </span>
                )}
                {filteredCommands.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {filteredCommands.length} {filteredCommands.length === 1 ? 'result' : 'results'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                "h-8 w-8 rounded-lg transition-colors",
                showPreview && "bg-primary/10 text-primary"
              )}
              title={showPreview ? "Hide preview" : "Show preview"}
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger
              value="default"
              className="rounded-md text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Default
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="rounded-md text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Custom
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Command List */}
        <div className={cn(
          "flex flex-col",
          showPreview ? "w-1/2 border-r border-border" : "w-full"
        )}>
          <div className="flex-1 overflow-y-auto relative">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <span className="text-sm text-muted-foreground">Loading commands...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <span className="text-sm text-destructive text-center">{error}</span>
              </div>
            )}

        {!isLoading && !error && (
          <>
            {/* Default Tab Content */}
            {activeTab === "default" && (
              <>
                {filteredCommands.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Command className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {searchQuery ? 'No commands found' : 'No default commands available'}
                    </span>
                    {!searchQuery && (
                      <p className="text-xs text-muted-foreground mt-2 text-center px-4">
                        Default commands are built-in system commands
                      </p>
                    )}
                  </div>
                )}

                {filteredCommands.length > 0 && (
                  <div className="p-2" ref={commandListRef}>
                    <div className="space-y-0.5">
                      {filteredCommands.map((command, index) => {
                        const Icon = getCommandIcon(command);
                        const isSelected = index === selectedIndex;
                        
                        return (
                          <button
                            key={command.id}
                            data-index={index}
                            onClick={() => handleCommandClick(command)}
                            onMouseEnter={() => {
                              setSelectedIndex(index);
                              setHoveredCommand(command);
                            }}
                            onMouseLeave={() => setHoveredCommand(null)}
                            className={cn(
                              "w-full flex items-start gap-3 px-3 py-2 rounded-md",
                              "hover:bg-accent transition-colors",
                              "text-left",
                              isSelected && "bg-accent"
                            )}
                          >
                            <Icon className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {command.full_command}
                                </span>
                                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                                  {command.scope}
                                </span>
                              </div>
                              {command.description && (
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {command.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Custom Tab Content */}
            {activeTab === "custom" && (
              <>
                {filteredCommands.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Search className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {searchQuery ? 'No commands found' : 'No custom commands available'}
                    </span>
                    {!searchQuery && (
                      <p className="text-xs text-muted-foreground mt-2 text-center px-4">
                        Create commands in <code className="px-1">.claude/commands/</code> or <code className="px-1">~/.claude/commands/</code>
                      </p>
                    )}
                  </div>
                )}

                {filteredCommands.length > 0 && (
                  <div className="p-2" ref={commandListRef}>
                    {/* If no grouping needed, show flat list */}
                    {Object.keys(groupedCommands).length === 1 ? (
                      <div className="space-y-0.5">
                        {filteredCommands.map((command, index) => {
                          const Icon = getCommandIcon(command);
                          const isSelected = index === selectedIndex;
                          
                          return (
                            <button
                              key={command.id}
                              data-index={index}
                              onClick={() => handleCommandClick(command)}
                              onMouseEnter={() => {
                                setSelectedIndex(index);
                                setHoveredCommand(command);
                              }}
                              onMouseLeave={() => setHoveredCommand(null)}
                              className={cn(
                                "w-full flex items-start gap-3 px-3 py-2 rounded-md",
                                "hover:bg-accent transition-colors",
                                "text-left",
                                isSelected && "bg-accent"
                              )}
                            >
                              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-mono text-sm text-primary">
                                    {command.full_command}
                                  </span>
                                  {command.accepts_arguments && (
                                    <span className="text-xs text-muted-foreground">
                                      [args]
                                    </span>
                                  )}
                                </div>
                                
                                {command.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {command.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-3 mt-1">
                                  {command.allowed_tools.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {command.allowed_tools.length} tool{command.allowed_tools.length === 1 ? '' : 's'}
                                    </span>
                                  )}
                                  
                                  {command.has_bash_commands && (
                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                      Bash
                                    </span>
                                  )}
                                  
                                  {command.has_file_references && (
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                      Files
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      // Show grouped by scope/namespace
                      <div className="space-y-4">
                        {Object.entries(groupedCommands).map(([groupKey, groupCommands]) => (
                          <div key={groupKey}>
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1 flex items-center gap-2">
                              {groupKey.startsWith("User Commands") && <User className="h-3 w-3" />}
                              {groupKey.startsWith("Project Commands") && <Building2 className="h-3 w-3" />}
                              {groupKey}
                            </h3>
                            
                            <div className="space-y-0.5">
                              {groupCommands.map((command) => {
                                const Icon = getCommandIcon(command);
                                const globalIndex = filteredCommands.indexOf(command);
                                const isSelected = globalIndex === selectedIndex;
                                
                                return (
                                  <button
                                    key={command.id}
                                    data-index={globalIndex}
                                    onClick={() => handleCommandClick(command)}
                                    onMouseEnter={() => {
                                      setSelectedIndex(globalIndex);
                                      setHoveredCommand(command);
                                    }}
                                    onMouseLeave={() => setHoveredCommand(null)}
                                    className={cn(
                                      "w-full flex items-start gap-3 px-3 py-2 rounded-md",
                                      "hover:bg-accent transition-colors",
                                      "text-left",
                                      isSelected && "bg-accent"
                                    )}
                                  >
                                    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-2">
                                        <span className="font-mono text-sm text-primary">
                                          {command.full_command}
                                        </span>
                                        {command.accepts_arguments && (
                                          <span className="text-xs text-muted-foreground">
                                            [args]
                                          </span>
                                        )}
                                      </div>
                                      
                                      {command.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                          {command.description}
                                        </p>
                                      )}
                                      
                                      <div className="flex items-center gap-3 mt-1">
                                        {command.allowed_tools.length > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            {command.allowed_tools.length} tool{command.allowed_tools.length === 1 ? '' : 's'}
                                          </span>
                                        )}
                                        
                                        {command.has_bash_commands && (
                                          <span className="text-xs text-blue-600 dark:text-blue-400">
                                            Bash
                                          </span>
                                        )}
                                        
                                        {command.has_file_references && (
                                          <span className="text-xs text-green-600 dark:text-green-400">
                                            Files
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 p-3 bg-muted/20">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50 font-mono text-[10px]">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50 font-mono text-[10px]">Enter</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50 font-mono text-[10px]">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-1/2 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {hoveredCommand || (filteredCommands.length > 0 && selectedIndex < filteredCommands.length) ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex flex-col p-4"
                >
                  {(() => {
                    const command = hoveredCommand || filteredCommands[selectedIndex];
                    if (!command) return null;

                    const Icon = getCommandIcon(command);

                    return (
                      <div className="h-full flex flex-col">
                        <div className="flex items-start gap-3 mb-4">
                          <Icon className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg leading-tight">
                              {command.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {command.full_command}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {command.scope}
                          </Badge>
                        </div>

                        {command.description && (
                          <div className="mb-4">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                              Description
                            </h4>
                            <p className="text-sm leading-relaxed">
                              {command.description}
                            </p>
                          </div>
                        )}

                        <div className="space-y-4 flex-1 overflow-y-auto">
                          {command.allowed_tools.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Zap className="h-3 w-3" />
                                Allowed Tools ({command.allowed_tools.length})
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {command.allowed_tools.map((tool) => (
                                  <Badge
                                    key={tool}
                                    variant="secondary"
                                    className="text-xs font-mono"
                                  >
                                    {tool}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {command.has_bash_commands && (
                              <div className="bg-muted/50 rounded-md p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Terminal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  <span className="text-xs font-medium">Bash Commands</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  This command can execute shell scripts
                                </p>
                              </div>
                            )}

                            {command.has_file_references && (
                              <div className="bg-muted/50 rounded-md p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <FileCode className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="text-xs font-medium">File References</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Can work with file paths and content
                                </p>
                              </div>
                            )}

                            {command.accepts_arguments && (
                              <div className="bg-muted/50 rounded-md p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <ArrowRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                  <span className="text-xs font-medium">Arguments</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Accepts custom parameters
                                </p>
                              </div>
                            )}

                            <div className="bg-muted/50 rounded-md p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-xs font-medium">Usage</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Type the command in chat to use it
                              </p>
                            </div>
                          </div>

                          <div className="mt-auto pt-4 border-t border-border">
                            <div className="bg-muted/30 rounded-md p-3">
                              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                <Info className="h-3 w-3" />
                                Quick Tips
                              </h4>
                              <ul className="space-y-1 text-xs text-muted-foreground">
                                <li>• Press Enter to insert this command</li>
                                <li>• Use ↑↓ to navigate between commands</li>
                                <li>• Esc to close this picker</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center p-8"
                >
                  <div className="text-center">
                    <Command className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "No command selected"
                        : "Hover over a command to see details"}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}; 
