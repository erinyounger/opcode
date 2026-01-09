import { useState, useEffect, useCallback } from "react";
import { api, type Agent } from "@/lib/api";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

type ToastMessage = { message: string; type: "success" | "error" } | null;

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const agentsList = await api.listAgents();
      setAgents(agentsList);
    } catch (err) {
      console.error("Failed to load agents:", err);
      const errorMsg = "Failed to load agents";
      setError(errorMsg);
      setToast({ message: errorMsg, type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const deleteAgent = useCallback(async (agent: Agent) => {
    if (!agent?.id) return;

    try {
      setIsDeleting(true);
      await api.deleteAgent(agent.id);
      setToast({ message: "Agent deleted successfully", type: "success" });
      await loadAgents();
    } catch (err) {
      console.error("Failed to delete agent:", err);
      const errorMsg = "Failed to delete agent";
      setToast({ message: errorMsg, type: "error" });
    } finally {
      setIsDeleting(false);
    }
  }, [loadAgents]);

  const exportAgent = useCallback(async (agent: Agent) => {
    try {
      const filePath = await save({
        defaultPath: `${agent.name.toLowerCase().replace(/\s+/g, "-")}.opcode.json`,
        filters: [
          {
            name: "opcode Agent",
            extensions: ["opcode.json"],
          },
        ],
      });

      if (!filePath) {
        return;
      }

      await invoke("export_agent_to_file", {
        id: agent.id,
        filePath,
      });

      setToast({
        message: `Agent "${agent.name}" exported successfully`,
        type: "success",
      });
    } catch (err) {
      console.error("Failed to export agent:", err);
      const errorMsg = "Failed to export agent";
      setToast({ message: errorMsg, type: "error" });
    }
  }, []);

  const importAgent = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const filePath = await open({
        multiple: false,
        filters: [
          {
            name: "opcode Agent",
            extensions: ["opcode.json", "json"],
          },
        ],
      });

      if (!filePath) {
        return;
      }

      await api.importAgentFromFile(filePath as string);

      setToast({ message: "Agent imported successfully", type: "success" });
      await loadAgents();
    } catch (err) {
      console.error("Failed to import agent:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to import agent";
      setToast({ message: errorMessage, type: "error" });
    }
  }, [loadAgents]);

  return {
    agents,
    loading,
    error,
    toast,
    isDeleting,
    loadAgents,
    deleteAgent,
    exportAgent,
    importAgent,
    setToast,
  };
};
