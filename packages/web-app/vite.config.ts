import typescript from '@rollup/plugin-typescript'
import { resolve } from 'path'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefresh(), typescript({ tsconfig: './tsconfig.json' })],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src')
    }
  }
})
