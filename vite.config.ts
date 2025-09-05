import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If you name your GitHub repo something else,
// update the base path below to '/<repo>/'.
export default defineConfig({
  plugins: [react()],
  base: '/itsm-shooter/',
})
