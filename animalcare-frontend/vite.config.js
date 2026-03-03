import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      minify: false,
      pages: [
        {
          entry: 'src/inventory/index.html',
          filename: 'inventory/index.html',
          template: 'src/inventory/index.html',
        }
      ]
    })
  ]
});