// LICENSE : MIT
"use strict";
require(['gitbook'], function (gitbook) {
    function addBeforeHeader(element) {
        jQuery('.book-header > h1').before(element)
    }

    function createButton({
        user,
        repo,
        type,
        size,
        count
        }) {
        var width = size === "large" ? "170px" : "160xp";
        var height = size === "large" ? "30" : "20xp";
        var extraParam = type === "watch" ? "&v=2" : "";
        return `<a class="btn pull-right" aria-label="github">
        <iframe style="display:inline-block;vertical-align:middle;" src="https://ghbtns.com/github-btn.html?user=${user}&repo=${repo}&type=${type}&count=${count}&size=${size}${extraParam}" frameborder="0" scrolling="0" width="${width}" height="${height}"></iframe>
        </a>`;
    }


    function insertGitHubLink({
        user,
        repo,
        types,
        size,
        count
        }) {
        types.reverse().forEach(type => {
            var elementString = createButton({
                user,
                repo,
                type,
                size,
                count
            });
            addBeforeHeader(elementString);
        });
    }

    function init(config) {
        var repoPath = config.repo;
        var [user, repo] = repoPath.split("/");
        if (repoPath == null) {
            console.log("Should set github.repo");
            return;
        }
        var types = config.types || ["star", "watch"];
        var size = config.size || "large";
        var count = typeof config.count === "undefined" ? "true" : "false";
        insertGitHubLink({
            user,
            repo,
            types,
            size,
            count
        });
    }

    // injected by html hook
    function getPluginConfig() {
        return window["gitbook-plugin-github-buttons"];
    }

    gitbook.events.bind('page.change', function () {
        init(getPluginConfig());
    });
});
