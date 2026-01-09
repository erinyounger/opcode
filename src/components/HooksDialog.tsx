import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HooksEditor } from "./HooksEditor";

interface HooksDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
}

export const HooksDialog: React.FC<HooksDialogProps> = ({
  isOpen,
  onOpenChange,
  projectPath,
}) => {
  const [activeHooksTab, setActiveHooksTab] = useState("project");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0">
        <div className="px-6 py-4 border-b border-border">
          <DialogTitle className="text-heading-2">Configure Hooks</DialogTitle>
          <DialogDescription className="mt-1 text-body-small text-muted-foreground">
            Configure hooks that run before, during, and after tool executions
          </DialogDescription>
        </div>

        <Tabs
          value={activeHooksTab}
          onValueChange={setActiveHooksTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1">
              <TabsTrigger value="project" className="py-2.5 px-3 text-body-small">
                Project Settings
              </TabsTrigger>
              <TabsTrigger value="local" className="py-2.5 px-3 text-body-small">
                Local Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="project" className="flex-1 overflow-auto px-6 pb-6 mt-0">
            <div className="space-y-4 pt-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-caption text-muted-foreground">
                  Project hooks are stored in{" "}
                  <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">
                    .claude/settings.json
                  </code>{" "}
                  and are committed to version control, allowing team members to share configurations.
                </p>
              </div>
              <HooksEditor projectPath={projectPath} scope="project" className="border-0" />
            </div>
          </TabsContent>

          <TabsContent value="local" className="flex-1 overflow-auto px-6 pb-6 mt-0">
            <div className="space-y-4 pt-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-caption text-muted-foreground">
                  Local hooks are stored in{" "}
                  <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">
                    .claude/settings.local.json
                  </code>{" "}
                  and are not committed to version control, perfect for personal preferences.
                </p>
              </div>
              <HooksEditor projectPath={projectPath} scope="local" className="border-0" />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
