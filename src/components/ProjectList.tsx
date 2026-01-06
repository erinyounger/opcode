import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  FolderOpen,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Project } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ProjectListProps {
  /**
   * Array of projects to display
   */
  projects: Project[];
  /**
   * Callback when a project is clicked
   */
  onProjectClick: (project: Project) => void;
  /**
   * Callback when open project is clicked
   */
  onOpenProject?: () => void | Promise<void>;
  /**
   * Whether the list is currently loading
   */
  loading?: boolean;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Extracts the project name from the full path
 */
const getProjectName = (path: string): string => {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
};

/**
 * Formats path to be more readable - shows full path relative to home
 * Truncates long paths with ellipsis in the middle
 */
const getDisplayPath = (path: string, maxLength: number = 30): string => {
  // Try to make path home-relative
  let displayPath = path;
  const homeIndicators = ['/Users/', '/home/'];
  for (const indicator of homeIndicators) {
    if (path.includes(indicator)) {
      const parts = path.split('/');
      const userIndex = parts.findIndex((_part, i) => 
        i > 0 && parts[i - 1] === indicator.split('/')[1]
      );
      if (userIndex > 0) {
        const relativePath = parts.slice(userIndex + 1).join('/');
        displayPath = `~/${relativePath}`;
        break;
      }
    }
  }
  
  // Truncate if too long
  if (displayPath.length > maxLength) {
    const start = displayPath.substring(0, Math.floor(maxLength / 2) - 2);
    const end = displayPath.substring(displayPath.length - Math.floor(maxLength / 2) + 2);
    return `${start}...${end}`;
  }
  
  return displayPath;
};

/**
 * ProjectList component - Displays recent projects in a Cursor-like interface
 * 
 * @example
 * <ProjectList
 *   projects={projects}
 *   onProjectClick={(project) => console.log('Selected:', project)}
 *   onOpenProject={() => console.log('Open project')}
 * />
 */
export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onProjectClick,
  onOpenProject,
  className,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Determine how many projects to show
  const projectsPerPage = showAll ? 10 : 5;
  const totalPages = Math.ceil(projects.length / projectsPerPage);
  
  // Calculate which projects to display
  const startIndex = showAll ? (currentPage - 1) * projectsPerPage : 0;
  const endIndex = startIndex + projectsPerPage;
  const displayedProjects = projects.slice(startIndex, endIndex);
  
  const handleViewAll = () => {
    setShowAll(true);
    setCurrentPage(1);
  };
  
  const handleViewLess = () => {
    setShowAll(false);
    setCurrentPage(1);
  };

  return (
    <div className={cn("h-full overflow-y-auto", className)}>
      <div className="max-w-6xl mx-auto flex flex-col h-full">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="mt-1 text-body-small text-muted-foreground">
                Select a project to start working with Claude Code
              </p>
            </div>
            <motion.div
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                onClick={onOpenProject}
                size="default"
                className="flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <FolderOpen className="h-4 w-4" />
                Open Project
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Recent projects section */}
          {displayedProjects.length > 0 ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-heading-4">Recent Projects</h2>
            {!showAll ? (
              <button 
                onClick={handleViewAll}
                className="text-caption text-muted-foreground hover:text-foreground transition-colors"
              >
                View all ({projects.length})
              </button>
            ) : (
              <button 
                onClick={handleViewLess}
                className="text-caption text-muted-foreground hover:text-foreground transition-colors"
              >
                View less
              </button>
            )}
          </div>
          
          <div className="space-y-1">
            {displayedProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.15,
                  delay: index * 0.02,
                }}
                className="group"
              >
                <motion.button
                  onClick={() => onProjectClick(project)}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-accent/60 transition-all duration-200 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 group"
                >
                  <span className="text-body font-medium group-hover:text-foreground transition-colors">
                    {getProjectName(project.path)}
                  </span>
                  <span className="text-caption text-muted-foreground font-mono text-right hover:text-muted-foreground/80 transition-colors" style={{ minWidth: '200px' }}>
                    {getDisplayPath(project.path, 35)}
                  </span>
                </motion.button>
              </motion.div>
            ))}
          </div>
          
          {/* Pagination controls */}
          {showAll && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <motion.div
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </motion.div>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              
              <motion.div
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          )}
            </Card>
          ) : (
            <Card className="p-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center justify-center text-center"
              >
                {/* Animated Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1
                  }}
                  className="relative"
                >
                  {/* Background glow */}
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                  />

                  {/* Icon container */}
                  <div className="relative h-20 w-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20 backdrop-blur-sm">
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <FolderOpen className="h-10 w-10 text-primary" />
                    </motion.div>
                  </div>

                  {/* Floating dots */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-1 -right-1"
                  >
                    <motion.div
                      animate={{
                        y: [-3, 3, -3],
                        rotate: [0, 180, 360],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="h-2 w-2 rounded-full bg-primary/40" />
                    </motion.div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="absolute -bottom-1 -left-1"
                  >
                    <motion.div
                      animate={{
                        y: [3, -3, 3],
                        rotate: [360, 180, 0],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    >
                      <div className="h-2 w-2 rounded-full bg-primary/40" />
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 space-y-3"
                >
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Welcome to Claude Code
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                    Start your AI-powered development journey by opening your first project
                  </p>
                </motion.div>

                {/* Action Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6"
                >
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Button
                      onClick={onOpenProject}
                      size="default"
                      className="flex items-center gap-2 px-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                    >
                      <FolderOpen className="h-5 w-5" />
                      Open Your First Project
                    </Button>
                  </motion.div>
                </motion.div>

                {/* Tips */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 flex items-center gap-4 text-xs text-muted-foreground/70"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
                    <span>Organize your work</span>
                  </div>
                  <div className="h-3 w-px bg-border/50" />
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    <span>AI assistance</span>
                  </div>
                </motion.div>
              </motion.div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}; 
