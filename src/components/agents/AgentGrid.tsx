import React from "react";
import { AnimatePresence } from "framer-motion";
import { type Agent } from "@/lib/api";
import { AgentCard } from "./AgentCard";
import { PaginationControls } from "./PaginationControls";

interface AgentGridProps {
  agents: Agent[];
  onExecuteAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  onExportAgent: (agent: Agent) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  AGENTS_PER_PAGE?: number;
}

export const AgentGrid: React.FC<AgentGridProps> = ({
  agents,
  onExecuteAgent,
  onEditAgent,
  onDeleteAgent,
  onExportAgent,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {agents.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={index}
              onExecute={onExecuteAgent}
              onEdit={onEditAgent}
              onDelete={onDeleteAgent}
              onExport={onExportAgent}
            />
          ))}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
};
