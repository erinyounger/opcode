import React from "react";
import { Plus, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateAgent: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateAgent }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Bot className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-heading-4 mb-2">No agents yet</h3>
      <p className="text-body-small text-muted-foreground mb-4">
        Create your first CC Agent to get started
      </p>
      <Button onClick={onCreateAgent} size="default">
        <Plus className="h-4 w-4 mr-2" />
        Create CC Agent
      </Button>
    </div>
  );
};
