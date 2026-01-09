import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportMenu } from "./ImportMenu";

interface AgentsHeaderProps {
  onBack: () => void;
  onCreateAgent: () => void;
  onImportAgent: () => void;
  onShowGitHubBrowser: () => void;
}

export const AgentsHeader: React.FC<AgentsHeaderProps> = ({
  onBack,
  onCreateAgent,
  onImportAgent,
  onShowGitHubBrowser,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-heading-1">CC Agents</h1>
            <p className="mt-1 text-body-small text-muted-foreground">
              Manage your Claude Code agents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ImportMenu
            onImportFromFile={onImportAgent}
            onShowGitHubBrowser={onShowGitHubBrowser}
          />
          <Button
            onClick={onCreateAgent}
            size="default"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create CC Agent
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
