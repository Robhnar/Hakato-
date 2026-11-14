import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    // Backend: uvicorn na porcie 8000 (patrz README).
    proxy: { '/api': 'http://localhost:8000' },
    // Pozwala importować contracts/fixtures/ spoza katalogu web/.
    fs: { allow: ['..'] },
  },
  test: { environment: 'node' },
})
