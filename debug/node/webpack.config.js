const path = require('path');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const CopyFilePlugin = require("copy-webpack-plugin");
const isProduction = process.env.NODE_ENV == 'production';



const config = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js', 
    },
	devServer: {
        port: 8080,
		open: true,
        liveReload: true,
	},
    watchOptions: {
        ignored: /node_modules/,
        poll: true  // 5秒ごとにチェック
    },
    mode: "development",
    plugins: [
        new CopyFilePlugin({
            patterns: [
            {
                context: path.resolve(__dirname, "src"),
                from: path.resolve(__dirname, "src/*.*"),
                to: path.resolve(__dirname, "dist"),
            },
            ]
        })
    ],
    module: {
        rules: [
            {
                test: /\.wasm$/,
                type: "asset/inline" },
        ],
    },
};
module.exports = () => {
    if (isProduction) {
        config.mode = 'production';
        
        
        config.plugins.push(new WorkboxWebpackPlugin.GenerateSW());
        
    } else {
        config.mode = 'development';
    }
    return config;
};





