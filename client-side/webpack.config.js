const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

// TODO: Change block name (if it more then one word put '_' between).
const blockName = 'data_visualization';

module.exports = {
    output: {
        uniqueName: blockName,
        publicPath: "auto"
    },
    optimization: {
        // Only needed to bypass a temporary bug
        runtimeChunk: false
    },
    plugins: [
        new ModuleFederationPlugin({
            name: blockName,
            filename: `${blockName}.js`,
            exposes: {
                './DataVisualizationModule': './src/app/block/index',
                './DataVisualizationEditorModule': './src/app/block-editor/index'
            },
            shared: {
                "@angular/core": { eager: true, singleton: true, strictVersion: false },
                "@angular/common": { eager: true, singleton: true, strictVersion: false },
                "@angular/common/http": { eager: true, singleton: true, strictVersion: false },
                "rxjs": { eager: true, singleton: true, strictVersion: false },
                "@ngx-translate/core": { eager: true, singleton: true, strictVersion: false },
                "@angular/router": { eager: true, singleton: true,  strictVersion: false }
            }
        }),
    ]
};