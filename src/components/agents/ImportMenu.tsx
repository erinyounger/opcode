import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, FileJson, Globe } from "lucide-react";

interface ImportMenuProps {
  onImportFromFile: () => void;
  onShowGitHubBrowser: () => void;
}

export const ImportMenu: React.FC<ImportMenuProps> = ({
  onImportFromFile,
  onShowGitHubBrowser,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="default"
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Import
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onImportFromFile}>
          <FileJson className="h-4 w-4 mr-2" />
          From File
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShowGitHubBrowser}>
          <Globe className="h-4 w-4 mr-2" />
          From GitHub
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
