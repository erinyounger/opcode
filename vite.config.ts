import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

const host = process.env.TAURI_DEV_HOST;

const manualChunks: Record<string, string[]> = {
  "react-vendor": ["react", "react-dom"],
  "ui-vendor": [
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-select",
    "@radix-ui/react-tabs",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-switch",
    "@radix-ui/react-popover",
  ],
  "editor-vendor": ["@uiw/react-md-editor"],
  "syntax-vendor": ["react-syntax-highlighter"],
  tauri: [
    "@tauri-apps/api",
    "@tauri-apps/plugin-dialog",
    "@tauri-apps/plugin-shell",
  ],
  utils: ["date-fns", "clsx", "tailwind-merge"],
};

export default defineConfig(async () => ({
  plugins: [react({
    // 优化JSX编译
    jsxRuntime: 'automatic',
  }), tailwindcss()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  build: {
    target: ['es2015', 'chrome80', 'firefox78', 'safari14'],
    minify: 'terser',
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1500,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,

    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },

    rollupOptions: {
      output: {
        manualChunks,
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tauri-apps/api',
    ],
    exclude: [
      '@uiw/react-md-editor',
      'react-syntax-highlighter',
    ],
  },
}));
