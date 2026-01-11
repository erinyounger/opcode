/**
 * Lightweight CodeBlock Component
 *
 * Uses the light build of react-syntax-highlighter with only required languages
 * to significantly reduce bundle size (636KB -> ~150KB).
 */
import React from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import markdown from "react-syntax-highlighter/dist/esm/languages/hljs/markdown";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import rust from "react-syntax-highlighter/dist/esm/languages/hljs/rust";
import css from "react-syntax-highlighter/dist/esm/languages/hljs/css";
import xml from "react-syntax-highlighter/dist/esm/languages/hljs/xml";
import yaml from "react-syntax-highlighter/dist/esm/languages/hljs/yaml";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";
import shell from "react-syntax-highlighter/dist/esm/languages/hljs/shell";
import diff from "react-syntax-highlighter/dist/esm/languages/hljs/diff";
import go from "react-syntax-highlighter/dist/esm/languages/hljs/go";

// Register languages
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("jsx", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("tsx", typescript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("rs", rust);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("scss", css);
SyntaxHighlighter.registerLanguage("html", xml);
SyntaxHighlighter.registerLanguage("xml", xml);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("shell", shell);
SyntaxHighlighter.registerLanguage("diff", diff);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("golang", go);

// Re-export the configured SyntaxHighlighter
export { SyntaxHighlighter };

// Export component props type
export interface CodeBlockProps {
  language: string;
  children: string;
  style?: Record<string, React.CSSProperties>;
  showLineNumbers?: boolean;
  startingLineNumber?: number;
  wrapLongLines?: boolean;
  customStyle?: React.CSSProperties;
  codeTagProps?: {
    style?: React.CSSProperties;
  };
  lineNumberStyle?: React.CSSProperties;
  PreTag?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
}

/**
 * Lightweight code block component with syntax highlighting
 */
function CodeBlock({
  language,
  children,
  style,
  showLineNumbers = false,
  startingLineNumber = 1,
  wrapLongLines = false,
  customStyle,
  codeTagProps,
  lineNumberStyle,
  PreTag = "pre",
}: CodeBlockProps): React.ReactElement {
  return (
    <SyntaxHighlighter
      language={language}
      style={style}
      showLineNumbers={showLineNumbers}
      startingLineNumber={startingLineNumber}
      wrapLongLines={wrapLongLines}
      customStyle={customStyle}
      codeTagProps={codeTagProps}
      lineNumberStyle={lineNumberStyle}
      PreTag={PreTag}
    >
      {children}
    </SyntaxHighlighter>
  );
}

export default CodeBlock;
