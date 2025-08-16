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
    'create-adrequest': './assets/javascript/app/create-adrequest.jsx',
    'ad-requests': './assets/javascript/app/ad-requests.tsx',  // entry point para la página de ad_requests
    'revision-adrequest': './assets/javascript/app/revision-adrequest.jsx',  // entry point para la página de detalles de adrequest
    'billing': './assets/javascript/billing/index.js',  // entry point for the app billing page
    'payment': './assets/javascript/payment.js',  // entry point for the payment page
    'update-payment-method': './assets/javascript/update-payment-method.js',  // entry point for the payment method update page
    'profile': './assets/javascript/profile/index.js',  // entry point for the user profile page
  },
  output: {
    path: path.resolve(__dirname, './static'),
    filename: 'js/[name]-bundle.js',
    library: ["SiteJS", "[name]"],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
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
