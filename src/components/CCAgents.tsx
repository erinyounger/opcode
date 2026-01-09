import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Agent, type AgentRunWithMetrics } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { CreateAgent } from "./CreateAgent";
import { AgentExecution } from "./AgentExecution";
import { AgentRunsList } from "./AgentRunsList";
import { GitHubAgentBrowser } from "./GitHubAgentBrowser";
import { AgentGrid } from "./agents/AgentGrid";
import { ExecutionHistory } from "./agents/ExecutionHistory";
import { AgentsHeader } from "./agents/AgentsHeader";
import { EmptyState } from "./agents/EmptyState";
import { DeleteConfirmationDialog } from "./agents/DeleteConfirmationDialog";
import { ImportMenu } from "./agents/ImportMenu";
import { useAgents } from "@/hooks/useAgents";
import { useAgentRuns } from "@/hooks/useAgentRuns";
import { usePagination } from "@/hooks/usePagination";

interface CCAgentsProps {
  onBack: () => void;
  className?: string;
}

type View = "list" | "create" | "edit" | "execute";

export const CCAgents: React.FC<CCAgentsProps> = ({ onBack, className }) => {
  const [view, setView] = useState<View>("list");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showGitHubBrowser, setShowGitHubBrowser] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const {
    agents,
    loading,
    error,
    loadAgents,
    deleteAgent,
    exportAgent,
    importAgent,
    toast,
    setToast,
  } = useAgents();

  const { runs, runsLoading, loadRuns } = useAgentRuns();

  const {
    currentPage,
    goToPage: setCurrentPage,
    totalPages,
    paginatedData: paginatedAgents,
    pageSize: AGENTS_PER_PAGE,
  } = usePagination(agents, { initialPageSize: 9 });

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setView("edit");
  };

  const handleExecuteAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setView("execute");
  };

  const handleAgentCreated = () => {
    setView("list");
    loadAgents();
    setToast({ message: "Agent created successfully", type: "success" });
  };

  const handleAgentUpdated = () => {
    setView("list");
    loadAgents();
    setToast({ message: "Agent updated successfully", type: "success" });
  };

  const handleExecutionComplete = () => {
    loadRuns();
  };

  const handleImportFromGitHub = async () => {
    setShowGitHubBrowser(false);
    await loadAgents();
    setToast({ message: "Agent imported successfully from GitHub", type: "success" });
  };

  if (view === "create") {
    return (
      <CreateAgent
        onBack={() => setView("list")}
        onAgentCreated={handleAgentCreated}
      />
    );
  }

  if (view === "edit" && selectedAgent) {
    return (
      <CreateAgent
        agent={selectedAgent}
        onBack={() => setView("list")}
        onAgentCreated={handleAgentUpdated}
      />
    );
  }

  if (view === "execute" && selectedAgent) {
    return (
      <AgentExecution
        agent={selectedAgent}
        onBack={() => {
          setView("list");
          handleExecutionComplete();
        }}
      />
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full p-6">
        <AgentsHeader
          onBack={onBack}
          onCreateAgent={() => setView("create")}
          onImportAgent={importAgent}
          onShowGitHubBrowser={() => setShowGitHubBrowser(true)}
        />

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-body-small text-destructive"
          >
            {error}
          </motion.div>
        )}

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="pt-6 space-y-8"
            >
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : agents.length === 0 ? (
                <EmptyState onCreateAgent={() => setView("create")} />
              ) : (
                <>
                  <AgentGrid
                    agents={paginatedAgents}
                    onExecuteAgent={handleExecuteAgent}
                    onEditAgent={handleEditAgent}
                    onDeleteAgent={setAgentToDelete}
                    onExportAgent={exportAgent}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    AGENTS_PER_PAGE={AGENTS_PER_PAGE}
                  />

                  <ExecutionHistory
                    runs={runs}
                    runsLoading={runsLoading}
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ToastContainer>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </ToastContainer>

      <GitHubAgentBrowser
        isOpen={showGitHubBrowser}
        onClose={() => setShowGitHubBrowser(false)}
        onImportSuccess={handleImportFromGitHub}
      />

      <DeleteConfirmationDialog
        agent={agentToDelete}
        onClose={() => setAgentToDelete(null)}
        onDeleted={loadRuns}
      />
    </div>
  );
};

export default CCAgents;
