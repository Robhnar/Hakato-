import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    // Backend: uvicorn on port 8000 (see README).
    proxy: { '/api': 'http://localhost:8000' },
    // Allows importing contracts/fixtures/ from outside the web/ directory.
    fs: { allow: ['..'] },
  },
  test: { environment: 'node' },
})
