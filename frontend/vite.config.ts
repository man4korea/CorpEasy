// 📁 frontend/vite.config.ts
// Update at 2504202200 Ver1.2

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // 개발 환경에서만 상세 로깅 활성화
  const isDev = mode === 'development';
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
          // 개발 환경에서는 프록시 로그 활성화
          ...(isDev && {
            configure: (proxy, options) => {
              proxy.on('error', (err, req, res) => {
                console.error('프록시 오류:', err);
              });
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log('프록시 요청:', req.method, req.url);
              });
              proxy.on('proxyRes', (proxyRes, req, res) => {
                console.log('프록시 응답:', proxyRes.statusCode, req.url);
              });
            }
          })
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@utils': path.resolve(__dirname, './src/utils')
      }
    },
    // 빌드 최적화 설정
    build: {
      sourcemap: mode !== 'production',
      minify: mode === 'production',
      // 청크 크기 경고 임계값 설정
      chunkSizeWarningLimit: 1000,
      // 프로덕션 빌드 최적화
      ...(mode === 'production' && {
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom']
              // @headlessui/react와 @heroicons/react 참조 제거
            }
          }
        }
      })
    }
  };
});