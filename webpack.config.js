// スタンドアロンJS

const path = require('path');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';



const config = {
    entry: './src/tbskmodem.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'tbskmodem.js', 
    },
    devServer: {
        open: true,
        host: 'localhost',
    },
    plugins: [
        //new HtmlWebpackPlugin({
        //    template: 'index.html',
        //}),

        // Add your plugins here
        // Learn more about plugins from https://webpack.js.org/configuration/plugins/
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
