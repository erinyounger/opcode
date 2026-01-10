/**
 * ProjectSettings component for managing project-specific hooks configuration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HooksEditor } from '@/components/HooksEditor';
import { SlashCommandsManager } from '@/components/SlashCommandsManager';
import { api } from '@/lib/api';
import {
  AlertTriangle,
  ArrowLeft,
  Settings,
  FolderOpen,
  GitBranch,
  Shield,
  Command
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Toast, ToastContainer } from '@/components/ui/toast';
import type { Project } from '@/lib/api';

// Constants
const SETTINGS_FILE_PATHS = {
  project: '.claude/settings.json',
  local: '.claude/settings.local.json',
} as const;

const TAB_CONFIG = [
  {
    id: 'commands',
    label: 'Slash Commands',
    icon: Command,
    description: 'Custom commands specific to this project',
    path: '.claude/slash-commands/',
  },
  {
    id: 'project',
    label: 'Project Hooks',
    icon: GitBranch,
    description: 'Hooks for all project users',
    path: SETTINGS_FILE_PATHS.project,
  },
  {
    id: 'local',
    label: 'Local Hooks',
    icon: Shield,
    description: 'Machine-specific hooks',
    path: SETTINGS_FILE_PATHS.local,
  },
] as const;

type TabId = typeof TAB_CONFIG[number]['id'];
type ToastMessage = { message: string; type: 'success' | 'error' };

interface ProjectSettingsProps {
  project: Project;
  onBack: () => void;
  className?: string;
}

// Custom Hooks
const useGitIgnore = (projectPath: string) => {
  const [isIgnored, setIsIgnored] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkGitIgnore = useCallback(async () => {
    setIsLoading(true);
    try {
      const gitignorePath = `${projectPath}/.gitignore`;
      const gitignoreContent = await api.readTextFile(gitignorePath);
      setIsIgnored(gitignoreContent.includes(SETTINGS_FILE_PATHS.local));
    } catch {
      setIsIgnored(false);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  const addToGitIgnore = useCallback(async () => {
    try {
      const gitignorePath = `${projectPath}/.gitignore`;
      let content = '';

      try {
        content = await api.readTextFile(gitignorePath);
      } catch {
        // File doesn't exist, create it
      }

      if (!content.includes(SETTINGS_FILE_PATHS.local)) {
        content += `\n# Claude local settings (machine-specific)\n${SETTINGS_FILE_PATHS.local}\n`;
        await api.saveClaudeMdFile(gitignorePath, content);
        setIsIgnored(true);
        return { success: true, message: 'Added to .gitignore' };
      }

      return { success: false, message: 'Already in .gitignore' };
    } catch (err) {
      console.error('Failed to update .gitignore:', err);
      return { success: false, message: 'Failed to update .gitignore' };
    }
  }, [projectPath]);

  useEffect(() => {
    checkGitIgnore();
  }, [checkGitIgnore]);

  return { isIgnored, isLoading, checkGitIgnore, addToGitIgnore };
};

const useToast = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return { toast, showToast, hideToast };
};

// Sub-components
interface SettingsCardProps {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ title, description, children }) => (
  <Card className="p-6">
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      </div>
      {children}
    </div>
  </Card>
);

interface GitIgnoreWarningProps {
  isIgnored: boolean;
  isLoading: boolean;
  onAddToGitIgnore: () => Promise<{ success: boolean; message?: string }>;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

const GitIgnoreWarning: React.FC<GitIgnoreWarningProps> = ({
  isIgnored,
  isLoading,
  onAddToGitIgnore,
  onShowToast,
}) => {
  const handleAddToGitIgnore = useCallback(async () => {
    const result = await onAddToGitIgnore();
    onShowToast(result.message || '', result.success ? 'success' : 'error');
  }, [onAddToGitIgnore, onShowToast]);

  if (isLoading || isIgnored) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-3 bg-yellow-500/10 rounded-md">
      <AlertTriangle className="h-5 w-5 text-yellow-600" />
      <div className="flex-1">
        <p className="text-sm text-yellow-600">Local settings file is not in .gitignore</p>
      </div>
      <Button size="sm" variant="outline" onClick={handleAddToGitIgnore}>
        Add to .gitignore
      </Button>
    </div>
  );
};

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
  project,
  onBack,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('commands');
  const { toast, showToast, hideToast } = useToast();
  const { isIgnored: gitIgnoreLocal, isLoading: gitIgnoreLoading, addToGitIgnore } = useGitIgnore(project.path);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabId);
  }, []);

  const renderTabContent = useMemo(() => {
    const tabMap: Record<TabId, JSX.Element> = {
      commands: (
        <SettingsCard
          title="Project Slash Commands"
          description={
            <>
              Custom commands that are specific to this project. These commands are stored in
              <code className="mx-1 px-2 py-1 bg-muted rounded text-xs">{TAB_CONFIG[0].path}</code>
              and can be committed to version control.
            </>
          }
        >
          <SlashCommandsManager projectPath={project.path} scopeFilter="project" />
        </SettingsCard>
      ),
      project: (
        <SettingsCard
          title="Project Hooks"
          description={
            <>
              These hooks apply to all users working on this project. They are stored in
              <code className="mx-1 px-2 py-1 bg-muted rounded text-xs">{SETTINGS_FILE_PATHS.project}</code>
              and should be committed to version control.
            </>
          }
        >
          <HooksEditor projectPath={project.path} scope="project" />
        </SettingsCard>
      ),
      local: (
        <SettingsCard
          title="Local Hooks"
          description={
            <>
              These hooks only apply to your machine. They are stored in
              <code className="mx-1 px-2 py-1 bg-muted rounded text-xs">{SETTINGS_FILE_PATHS.local}</code>
              and should NOT be committed to version control.
            </>
          }
        >
          <GitIgnoreWarning
            isIgnored={gitIgnoreLocal}
            isLoading={gitIgnoreLoading}
            onAddToGitIgnore={addToGitIgnore}
            onShowToast={showToast}
          />
          <HooksEditor projectPath={project.path} scope="local" />
        </SettingsCard>
      ),
    };

    return tabMap;
  }, [project.path, gitIgnoreLocal, gitIgnoreLoading, addToGitIgnore, showToast]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Project Settings</h2>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="font-mono">{project.path}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6">
              {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
                <TabsTrigger key={id} value={id} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="commands" className="space-y-6">
              {renderTabContent.commands}
            </TabsContent>

            <TabsContent value="project" className="space-y-6">
              {renderTabContent.project}
            </TabsContent>

            <TabsContent value="local" className="space-y-6">
              {renderTabContent.local}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={hideToast}
          />
        )}
      </ToastContainer>
    </div>
  );
}; 
