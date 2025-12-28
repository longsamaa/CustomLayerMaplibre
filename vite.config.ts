import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api/map4d': {
        target: 'https://tile.map4d.vn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/map4d/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Referer', 'https://map.map4d.vn/');
          });
        }
      }
    }
  }
})
