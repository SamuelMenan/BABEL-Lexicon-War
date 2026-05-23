import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'SUPABASE_'],
  resolve: {
    alias: {
      '@game': '/game',
      '@shared': '/shared',
      '@app': '/app',
    },
  },
});
