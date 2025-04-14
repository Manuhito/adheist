const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

// Load environment variables
const APP_URL = process.env.APP_URL || 'http://localhost:8000';

module.exports = {
  entry: {
    'site-base': './assets/site-base.js',  // base styles shared between frameworks
    'site-tailwind': './assets/site-tailwind.js',  // required for tailwindcss styles
    site: './assets/javascript/site.js',  // global site javascript
    app: './assets/javascript/app.js',  // logged-in javascript
    base: './assets/javascript/base/index.jsx',  // layout base con header y footer
    landing: './assets/javascript/landing/index.jsx',  // nuevo entry para los componentes de landing
    pricing: './assets/javascript/pricing/index.jsx',  // entry point para la página de pricing
    blog: './assets/javascript/blog/index.jsx',  // entry point para el blog
    'blog-post': './assets/javascript/blog/post/index.jsx',  // entry point para el post individual
    'app-header': './assets/javascript/app-header.js',
  },
  output: {
    path: path.resolve(__dirname, './static'),
    filename: 'js/[name]-bundle.js',
    library: ["SiteJS", "[name]"],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, 'assets/javascript'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@/components': path.resolve(__dirname, './assets/javascript/components'),
      '@/shadcn': path.resolve(__dirname, './assets/javascript/shadcn/components'),
      '@/utilities': path.resolve(__dirname, './assets/javascript/utilities'),
    },
    fallback: {
      'use-sync-external-store/shim': require.resolve('use-sync-external-store/shim')
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              '@babel/preset-env',
              "@babel/preset-react",
              '@babel/preset-typescript'
            ]
          }
        }
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'APP_URL': JSON.stringify(APP_URL)
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
      chunkFilename: 'css/[id].css',
    }),
  ],
  optimization: {
    minimizer: [new TerserPlugin({
      extractComments: false,  // disable generation of license.txt files
    })],
  },
  devtool: "eval-cheap-source-map",
};
