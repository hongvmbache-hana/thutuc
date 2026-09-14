import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

function onlineExcelProxyPlugin(): Plugin {
  return {
    name: 'online-excel-proxy',
    configureServer(server) {
      server.middlewares.use('/api/fetch-online-excel', async (req, res) => {
        try {
          const reqUrl = new URL(req.url || '', 'http://localhost:3000');
          const targetUrl = reqUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Thiếu tham số url' }));
            return;
          }
          const fetchRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*'
            },
            redirect: 'follow'
          });
          if (!fetchRes.ok) {
            res.statusCode = fetchRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `Lỗi máy chủ nguồn: ${fetchRes.status} ${fetchRes.statusText}` }));
            return;
          }
          const buf = await fetchRes.arrayBuffer();
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'application/octet-stream');
          res.end(Buffer.from(buf));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Không thể tải file từ đường dẫn trực tuyến' }));
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), onlineExcelProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
