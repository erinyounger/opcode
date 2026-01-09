import React from "react";
import { motion } from "framer-motion";
import { Edit, Trash2, Play, Upload } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Agent } from "@/lib/api";
import { ICON_MAP, type AgentIconName } from "../IconPicker";

interface AgentCardProps {
  agent: Agent;
  index: number;
  onExecute: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onExport: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  index,
  onExecute,
  onEdit,
  onDelete,
  onExport,
}) => {
  const renderIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName as AgentIconName] || ICON_MAP.bot;
    return <Icon className="h-12 w-12" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="mb-4 p-4 rounded-full bg-primary/10 text-primary">
            {renderIcon(agent.icon)}
          </div>
          <h3 className="text-heading-4 mb-2">{agent.name}</h3>
          <p className="text-caption text-muted-foreground">
            Created: {new Date(agent.created_at).toLocaleDateString()}
          </p>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onExecute(agent)}
            className="flex items-center gap-1"
            title="Execute agent"
          >
            <Play className="h-3 w-3" />
            Execute
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(agent)}
            className="flex items-center gap-1"
            title="Edit agent"
          >
            <Edit className="h-3 w-3" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onExport(agent)}
            className="flex items-center gap-1"
            title="Export agent to .opcode.json"
          >
            <Upload className="h-3 w-3" />
            Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(agent)}
            className="flex items-center gap-1 text-destructive hover:text-destructive"
            title="Delete agent"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
