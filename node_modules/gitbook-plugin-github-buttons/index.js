module.exports = {
    book: {
        assets: './lib',
        js: [
            'plugin.js'
        ],
        html: {
            "head:end": function () {
                // window["gitbook-plugin-github-buttons"]
                var configs = JSON.stringify(this.options.pluginsConfig["github-buttons"]);
                return '<script>' +
                    'window["gitbook-plugin-github-buttons"] = ' + configs + ';'
                    + '</script>';
            }
        }
    }

};
