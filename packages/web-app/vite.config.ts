import typescript from '@rollup/plugin-typescript'
import { resolve } from 'path'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, 'env')

  // Plugin so we can use default %env_variable%
  const htmlEnvPlugin = () => {
    return {
      name: 'html-transform',
      transformIndexHtml(html: string) {
        return html.replace(/%(.*?)%/g, function (_, p1) {
          return env[p1]
        })
      }
    }
  }

  return {
    plugins: [
      htmlEnvPlugin(),
      reactRefresh(),
      typescript({ tsconfig: './tsconfig.json' })
    ],
    resolve: {
      alias: {
        '~': resolve(__dirname, 'src')
      }
    }
  }
})
