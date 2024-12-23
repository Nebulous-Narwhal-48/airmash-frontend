const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const crypto = require('crypto');
const fs = require('fs');

module.exports = {
  entry: {
    'assets/engine.js': [
      './src/js/main.js'
    ],
  },
  output: {
    filename: '[name]',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devtool: false,
  plugins: [
    new CopyPlugin([
      { from: './src/assets', to: 'assets' },
      { from: './src/css', to: 'assets' },
      { from: './src/robots.txt', to: 'robots.txt' },
      { from: './src/html/privacy.html', to: 'privacy.html' },
      { from: './src/html/contact.html', to: 'contact.html' },
    ]),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/html/index.html',
      minify: {
        collapseWhitespace: false,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true
      },
      hash: true,
      inject: 'head',
      scriptLoading: 'blocking',
    }),
    
    // add style.css tag to index.html
    new class {
      apply(compiler) {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
          const contentHash = crypto.createHash('md5').update(fs.readFileSync('dist/assets/style.css', 'utf8')).digest('hex');
          const indexHtml = fs.readFileSync('dist/index.html', 'utf8');
          const newHtml = indexHtml.replace('</head>', `<link rel="stylesheet" href="assets/style.css?${contentHash}"></head>`);
          fs.writeFileSync('dist/index.html', newHtml);
        });
      }
    }
  ],
}
