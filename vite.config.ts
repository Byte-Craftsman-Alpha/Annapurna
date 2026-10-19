import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-expect-error The optional local source-tag helper has no type declarations.
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch { /* Source tagging is optional outside the editor. */ }

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
    build: {
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/@firebase/') || id.includes('node_modules/firebase/')) return 'firebase';
            if (id.includes('node_modules/framer-motion/') || id.includes('node_modules/motion-')) return 'motion';
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) return 'react';
          },
        },
      },
    },
  };
})
