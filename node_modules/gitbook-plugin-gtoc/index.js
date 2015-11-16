module.exports = {
    book: {
        assets: "./book",
        js: [
            "gtoc.js"
        ],
        css: [
            "gtoc.css"
        ]
    },
    hooks: {
        init: function() {
            console.log("init!");
        },
        finish: function() {
            console.log("finish!");
        }
    }
};