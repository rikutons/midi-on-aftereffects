var ES3Plugin = require("webpack-es3-plugin");
module.exports = {
    entry: './mymidifire.jsx',
    output: {
        filename: 'output.js',
        path: __dirname
    },
    // mode: 'production',  //モード
    mode: 'development',
    devtool: false,
    plugins: [new ES3Plugin()]
};
