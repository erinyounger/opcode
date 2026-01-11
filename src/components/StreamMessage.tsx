import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Terminal,
  User,
  Bot,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SyntaxHighlighter } from "./CodeBlock";
import { getClaudeSyntaxTheme } from "@/lib/claudeSyntaxTheme";
import { useTheme } from "@/hooks";
import type { ClaudeStreamMessage } from "./AgentExecution";
import {
  TodoWidget,
  TodoReadWidget,
  LSWidget,
  ReadWidget,
  ReadResultWidget,
  GlobWidget,
  BashWidget,
  WriteWidget,
  GrepWidget,
  EditWidget,
  EditResultWidget,
  MCPWidget,
  CommandWidget,
  CommandOutputWidget,
  SummaryWidget,
  MultiEditWidget,
  MultiEditResultWidget,
  SystemReminderWidget,
  SystemInitializedWidget,
  TaskWidget,
  LSResultWidget,
  ThinkingWidget,
  WebSearchWidget,
  WebFetchWidget
} from "./ToolWidgets";

interface StreamMessageProps {
  message: ClaudeStreamMessage;
  className?: string;
  streamMessages: ClaudeStreamMessage[];
  onLinkDetected?: (url: string) => void;
}

// Tools that have dedicated widgets
const TOOLS_WITH_WIDGETS = [
  'task', 'edit', 'multiedit', 'todowrite', 'todoread',
  'ls', 'read', 'glob', 'bash', 'write', 'grep',
  'websearch', 'webfetch'
] as const;

// Code block configuration
const CODE_COLLAPSE_THRESHOLD = 15;
const CODE_COLLAPSED_HEIGHT = '300px';

// Memory management constants
const MAX_CONTENT_LENGTH = 10000;

interface CodeBlockProps {
  language: string;
  code: string;
  syntaxTheme: any;
}

function CodeBlock({ language, code, syntaxTheme }: CodeBlockProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const lineCount = code.split('\n').length;
  const isLongCode = lineCount > CODE_COLLAPSE_THRESHOLD;

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [code]);

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  const shouldCollapse = isLongCode && !isExpanded;

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 flex items-center gap-2 z-10">
        {isLongCode && (
          <button
            onClick={handleToggleExpand}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-muted hover:bg-muted/80 text-foreground text-xs px-2 py-1 rounded border border-border"
          >
            {isExpanded ? '收起' : `展开 (${lineCount} 行)`}
          </button>
        )}
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity bg-muted hover:bg-muted/80 text-foreground text-xs px-2 py-1 rounded border border-border"
        >
          {isCopied ? '✓ 已复制' : '复制'}
        </button>
      </div>
      <div
        className={shouldCollapse ? "relative" : ""}
        style={shouldCollapse ? { maxHeight: CODE_COLLAPSED_HEIGHT, overflow: 'hidden' } : {}}
      >
        <SyntaxHighlighter
          style={syntaxTheme}
          language={language}
          PreTag="div"
        >
          {code}
        </SyntaxHighlighter>
        {shouldCollapse && (
          <div
            className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--color-card))' }}
          />
        )}
      </div>
      {shouldCollapse && (
        <div
          onClick={handleToggleExpand}
          className="w-full flex items-center justify-center py-1.5 text-xs text-muted-foreground hover:text-foreground border-t border-border bg-card/50 hover:bg-card transition-colors cursor-pointer"
        >
          <span>点击展开完整代码 ({lineCount} 行)</span>
        </div>
      )}
    </div>
  );
}

interface MarkdownLinkProps {
  href?: string;
  children?: React.ReactNode;
}

function MarkdownLink({ href, children, ...props }: MarkdownLinkProps): React.ReactElement {
  const isExternal = href?.startsWith('http');
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-1"
      {...props}
    >
      {children}
      {isExternal && (
        <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </a>
  );
}

interface MarkdownImageProps {
  src?: string;
  alt?: string;
  onEnlarge: (src: string) => void;
}

function MarkdownImage({ src, alt, onEnlarge, ...props }: MarkdownImageProps): React.ReactElement {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
      style={{ maxHeight: '400px' }}
      onClick={() => src && onEnlarge(src)}
      {...props}
    />
  );
}

interface ToolWidgetRendererProps {
  toolName: string;
  input: any;
  toolResult: any;
  originalName: string;
}

function renderToolWidget({ toolName, input, toolResult, originalName }: ToolWidgetRendererProps): React.ReactElement | null {
  if (toolName === "task" && input) {
    return <TaskWidget description={input.description} prompt={input.prompt} result={toolResult} />;
  }

  if (toolName === "edit" && input?.file_path) {
    return <EditWidget {...input} result={toolResult} />;
  }

  if (toolName === "multiedit" && input?.file_path && input?.edits) {
    return <MultiEditWidget {...input} result={toolResult} />;
  }

  if (originalName?.startsWith("mcp__")) {
    return <MCPWidget toolName={originalName} input={input} result={toolResult} />;
  }

  if (toolName === "todowrite" && input?.todos) {
    return <TodoWidget todos={input.todos} result={toolResult} />;
  }

  if (toolName === "todoread") {
    return <TodoReadWidget todos={input?.todos} result={toolResult} />;
  }

  if (toolName === "ls" && input?.path) {
    return <LSWidget path={input.path} result={toolResult} />;
  }

  if (toolName === "read" && input?.file_path) {
    return <ReadWidget filePath={input.file_path} result={toolResult} />;
  }

  if (toolName === "glob" && input?.pattern) {
    return <GlobWidget pattern={input.pattern} result={toolResult} />;
  }

  if (toolName === "bash" && input?.command) {
    return <BashWidget command={input.command} description={input.description} result={toolResult} />;
  }

  if (toolName === "write" && input?.file_path && input?.content) {
    return <WriteWidget filePath={input.file_path} content={input.content} result={toolResult} />;
  }

  if (toolName === "grep" && input?.pattern) {
    return <GrepWidget pattern={input.pattern} include={input.include} path={input.path} exclude={input.exclude} result={toolResult} />;
  }

  if (toolName === "websearch" && input?.query) {
    return <WebSearchWidget query={input.query} result={toolResult} />;
  }

  if (toolName === "webfetch" && input?.url) {
    return <WebFetchWidget url={input.url} prompt={input.prompt} result={toolResult} />;
  }

  return null;
}

interface FallbackToolDisplayProps {
  toolName: string;
  input: any;
}

function FallbackToolDisplay({ toolName, input }: FallbackToolDisplayProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">
          Using tool: <code className="font-mono">{toolName}</code>
        </span>
      </div>
      {input && (
        <div className="ml-6 p-2 bg-background rounded-md border">
          <pre className="text-xs font-mono overflow-x-auto">
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function extractToolResults(streamMessages: ClaudeStreamMessage[]): Map<string, any> {
  const results = new Map<string, any>();

  for (const msg of streamMessages) {
    if (msg.type === "user" && msg.message?.content && Array.isArray(msg.message.content)) {
      for (const content of msg.message.content) {
        if (content.type === "tool_result" && content.tool_use_id) {
          results.set(content.tool_use_id, content);
        }
      }
    }
  }

  return results;
}

function extractContentText(content: any): string {
  let text = '';

  if (typeof content.content === 'string') {
    text = content.content;
  } else if (content.content && typeof content.content === 'object') {
    if (content.content.text) {
      text = content.content.text;
    } else if (Array.isArray(content.content)) {
      text = content.content
        .map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c)))
        .join('\n');
    } else {
      text = JSON.stringify(content.content, null, 2);
    }
  }

  // Apply length limit to prevent memory bloat
  if (text.length > MAX_CONTENT_LENGTH) {
    return text.slice(-MAX_CONTENT_LENGTH);
  }

  return text;
}

function findToolUseInMessages(
  streamMessages: ClaudeStreamMessage[],
  toolUseId: string,
  toolNameFilter?: string
): any | null {
  for (let i = streamMessages.length - 1; i >= 0; i--) {
    const prevMsg = streamMessages[i];
    if (prevMsg.type === 'assistant' && prevMsg.message?.content && Array.isArray(prevMsg.message.content)) {
      const toolUse = prevMsg.message.content.find((c: any) => {
        if (c.type !== 'tool_use' || c.id !== toolUseId) return false;
        if (toolNameFilter && c.name?.toLowerCase() !== toolNameFilter) return false;
        return true;
      });
      if (toolUse) return toolUse;
    }
  }
  return null;
}

function hasCorrespondingToolWidget(
  content: any,
  streamMessages: ClaudeStreamMessage[]
): boolean {
  if (!content.tool_use_id || !streamMessages) return false;

  const toolUse = findToolUseInMessages(streamMessages, content.tool_use_id);
  if (!toolUse) return false;

  const toolName = toolUse.name?.toLowerCase();
  return TOOLS_WITH_WIDGETS.includes(toolName) || toolUse.name?.startsWith('mcp__');
}

interface ToolResultRendererProps {
  content: any;
  contentText: string;
  streamMessages: ClaudeStreamMessage[];
}

function ToolResultRenderer({ content, contentText, streamMessages }: ToolResultRendererProps): React.ReactElement | null {
  // Check for system reminder
  const reminderMatch = contentText.match(/<system-reminder>(.*?)<\/system-reminder>/s);
  if (reminderMatch) {
    const reminderMessage = reminderMatch[1].trim();
    const beforeReminder = contentText.substring(0, reminderMatch.index || 0).trim();
    const afterReminder = contentText.substring((reminderMatch.index || 0) + reminderMatch[0].length).trim();

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs font-medium">Tool Result</span>
        </div>
        {beforeReminder && (
          <div className="ml-6 p-2 bg-background rounded-md border">
            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{beforeReminder}</pre>
          </div>
        )}
        <div className="ml-6">
          <SystemReminderWidget message={reminderMessage} />
        </div>
        {afterReminder && (
          <div className="ml-6 p-2 bg-background rounded-md border">
            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{afterReminder}</pre>
          </div>
        )}
      </div>
    );
  }

  // Check for Edit result
  if (contentText.includes("has been updated. Here's the result of running `cat -n`")) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs font-medium">Edit Result</span>
        </div>
        <EditResultWidget content={contentText} />
      </div>
    );
  }

  // Check for MultiEdit result
  const isMultiEditResult = contentText.includes("has been updated with multiple edits") ||
                           contentText.includes("MultiEdit completed successfully") ||
                           contentText.includes("Applied multiple edits to");
  if (isMultiEditResult) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs font-medium">MultiEdit Result</span>
        </div>
        <MultiEditResultWidget content={contentText} />
      </div>
    );
  }

  // Check for LS result
  if (content.tool_use_id && typeof contentText === 'string') {
    const lsToolUse = findToolUseInMessages(streamMessages, content.tool_use_id, 'ls');
    if (lsToolUse) {
      const lines = contentText.split('\n');
      const hasTreeStructure = lines.some(line => /^\s*-\s+/.test(line));
      const hasNoteAtEnd = lines.some(line => line.trim().startsWith('NOTE: do any of the files'));

      if (hasTreeStructure || hasNoteAtEnd) {
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-medium">Directory Contents</span>
            </div>
            <LSResultWidget content={contentText} />
          </div>
        );
      }
    }
  }

  // Check for Read result
  if (content.tool_use_id && typeof contentText === 'string' && /^\s*\d+→/.test(contentText)) {
    const readToolUse = findToolUseInMessages(streamMessages, content.tool_use_id, 'read');
    const filePath = readToolUse?.input?.file_path;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs font-medium">Read Result</span>
        </div>
        <ReadResultWidget content={contentText} filePath={filePath} />
      </div>
    );
  }

  // Empty result
  if (!contentText || contentText.trim() === '') {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs font-medium">Tool Result</span>
        </div>
        <div className="ml-6 p-2 bg-muted/50 rounded-md border text-xs text-muted-foreground italic">
          Tool did not return any output
        </div>
      </div>
    );
  }

  // Default result display
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {content.is_error ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
        <span className="text-xs font-medium">Tool Result</span>
      </div>
      <div className="ml-6 p-2 bg-background rounded-md border">
        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{contentText}</pre>
      </div>
    </div>
  );
}

interface ResultMessageProps {
  message: ClaudeStreamMessage;
}

function ResultMessage({ message }: ResultMessageProps): React.ReactElement {
  const isError = message.is_error || message.subtype?.includes("error");

  return (
    <div className="flex items-center justify-end gap-2 px-3 py-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {isError ? (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-destructive font-medium">Failed</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <span className="text-green-600 font-medium">Complete</span>
          </>
        )}
        {message.duration_ms !== undefined && (
          <span className="ml-2">{(message.duration_ms / 1000).toFixed(1)}s</span>
        )}
        {(message.cost_usd !== undefined || message.total_cost_usd !== undefined) && (
          <span className="ml-2">${((message.cost_usd || message.total_cost_usd)!).toFixed(4)}</span>
        )}
        {message.usage && (
          <span className="ml-2">{message.usage.input_tokens + message.usage.output_tokens} tokens</span>
        )}
      </div>
    </div>
  );
}

interface ErrorDisplayProps {
  error: unknown;
  className?: string;
}

function ErrorDisplay({ error, className }: ErrorDisplayProps): React.ReactElement {
  return (
    <Card className={cn("border-destructive/20 bg-destructive/5", className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium">Error rendering message</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
}

function ImageLightbox({ src, onClose }: ImageLightboxProps): React.ReactElement {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt="Enlarged view"
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}

function StreamMessageComponentInner({ message, className, streamMessages, onLinkDetected }: StreamMessageProps): React.ReactElement | null {
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const { theme } = useTheme();
  const syntaxTheme = getClaudeSyntaxTheme(theme);

  const toolResults = useMemo(() => extractToolResults(streamMessages), [streamMessages]);

  const getToolResult = useCallback((toolId: string | undefined): any => {
    if (!toolId) return null;
    return toolResults.get(toolId) || null;
  }, [toolResults]);

  const getTextContent = useCallback((content: any): string => {
    if (typeof content.text === 'string') return content.text;
    return content.text?.text || JSON.stringify(content.text || content);
  }, []);

  const markdownComponents = useMemo(() => ({
    code({ node, inline, className: codeClassName, children, ...props }: any) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const codeString = String(children).replace(/\n$/, '');

      if (!inline && match) {
        return <CodeBlock language={match[1]} code={codeString} syntaxTheme={syntaxTheme} />;
      }

      return (
        <code className={codeClassName} {...props}>
          {children}
        </code>
      );
    },
    a: MarkdownLink,
    img(props: any) {
      return <MarkdownImage {...props} onEnlarge={setEnlargedImage} />;
    }
  }), [syntaxTheme]);

  try {
    // Skip meta messages without content
    if (message.isMeta && !message.leafUuid && !message.summary) {
      return null;
    }

    // Summary message
    if (message.leafUuid && message.summary && (message as any).type === "summary") {
      return <SummaryWidget summary={message.summary} leafUuid={message.leafUuid} />;
    }

    // System init message
    if (message.type === "system" && message.subtype === "init") {
      return (
        <SystemInitializedWidget
          sessionId={message.session_id}
          model={message.model}
          cwd={message.cwd}
          tools={message.tools}
        />
      );
    }

    // Assistant message
    if (message.type === "assistant" && message.message) {
      const msg = message.message;
      let renderedSomething = false;

      const contentElements = msg.content && Array.isArray(msg.content)
        ? msg.content.map((content: any, idx: number) => {
            // Text content
            if (content.type === "text") {
              const textContent = getTextContent(content);
              renderedSomething = true;
              return (
                <div key={idx} className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {textContent}
                  </ReactMarkdown>
                </div>
              );
            }

            // Thinking content
            if (content.type === "thinking") {
              renderedSomething = true;
              return (
                <div key={idx}>
                  <ThinkingWidget thinking={content.thinking || ''} signature={content.signature} />
                </div>
              );
            }

            // Tool use
            if (content.type === "tool_use") {
              const toolName = content.name?.toLowerCase();
              const input = content.input;
              const toolResult = getToolResult(content.id);

              const widget = renderToolWidget({
                toolName,
                input,
                toolResult,
                originalName: content.name
              });

              if (widget) {
                renderedSomething = true;
                return <div key={idx}>{widget}</div>;
              }

              renderedSomething = true;
              return <div key={idx}><FallbackToolDisplay toolName={content.name} input={input} /></div>;
            }

            return null;
          })
        : null;

      if (!renderedSomething) return null;

      return (
        <Card className={cn("border-primary/20 bg-primary/5", className)}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Bot className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1 space-y-1.5 min-w-0">
                {contentElements}
                {msg.usage && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Tokens: {msg.usage.input_tokens} in, {msg.usage.output_tokens} out
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // User message
    if (message.type === "user") {
      if (message.isMeta) return null;

      const msg = message.message || message;
      let renderedSomething = false;

      // Handle string content
      let stringContentElement: React.ReactElement | null = null;
      if (typeof msg.content === 'string' || (msg.content && !Array.isArray(msg.content))) {
        const contentStr = typeof msg.content === 'string' ? msg.content : String(msg.content);
        if (contentStr.trim() !== '') {
          renderedSomething = true;

          // Check for command message
          const commandMatch = contentStr.match(/<command-name>(.+?)<\/command-name>[\s\S]*?<command-message>(.+?)<\/command-message>[\s\S]*?<command-args>(.*?)<\/command-args>/);
          if (commandMatch) {
            const [, commandName, commandMessage, commandArgs] = commandMatch;
            stringContentElement = (
              <CommandWidget
                commandName={commandName.trim()}
                commandMessage={commandMessage.trim()}
                commandArgs={commandArgs?.trim()}
              />
            );
          } else {
            // Check for command output
            const stdoutMatch = contentStr.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/);
            if (stdoutMatch) {
              stringContentElement = <CommandOutputWidget output={stdoutMatch[1]} onLinkDetected={onLinkDetected} />;
            } else {
              stringContentElement = <div className="text-xs">{contentStr}</div>;
            }
          }
        }
      }

      // Handle array content
      const arrayContentElements = Array.isArray(msg.content)
        ? msg.content.map((content: any, idx: number) => {
            // Tool result
            if (content.type === "tool_result") {
              if (hasCorrespondingToolWidget(content, streamMessages)) {
                return null;
              }

              const contentText = extractContentText(content);
              renderedSomething = true;
              return (
                <div key={idx}>
                  <ToolResultRenderer content={content} contentText={contentText} streamMessages={streamMessages} />
                </div>
              );
            }

            // Text content
            if (content.type === "text") {
              const textContent = typeof content.text === 'string'
                ? content.text
                : (content.text?.text || JSON.stringify(content.text));

              renderedSomething = true;
              return <div key={idx} className="text-xs">{textContent}</div>;
            }

            return null;
          })
        : null;

      if (!renderedSomething) return null;

      return (
        <>
          <Card className={cn("border-muted-foreground/20 bg-muted/20", className)}>
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  {stringContentElement}
                  {arrayContentElements}
                </div>
              </div>
            </CardContent>
          </Card>
          {enlargedImage && <ImageLightbox src={enlargedImage} onClose={() => setEnlargedImage(null)} />}
        </>
      );
    }

    // Result message
    if (message.type === "result") {
      return <ResultMessage message={message} />;
    }

    return null;
  } catch (error) {
    console.error("Error rendering stream message:", error, message);
    return <ErrorDisplay error={error} className={className} />;
  }
}

const StreamMessageComponent = React.memo(StreamMessageComponentInner);

export { StreamMessageComponent as StreamMessage };
