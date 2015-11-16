require.config({
    "baseUrl":"../gitbook/plugins"
});

require(["gitbook","gitbook-plugin-gtoc/mod/content",
         "gitbook-plugin-gtoc/mod/interaction",
         "gitbook-plugin-gtoc/mod/elevator"
         ], 
        function(gitbook,content,action,elevator) {

    // 配置默认参数
    var defaultConfig = {
        "hide":true         // 默认是隐藏模式
        ,"el":"h2,h3"       // 待抽取元素名，默认是抽取h2,h3标题，标准的jQuery选择表达式
        ,"elevator":true    // 默认有电梯效果

    };

    var resetToc = function(config){
        var $ibook = gitbook.state.$book;

        var _config = $.extend(defaultConfig,config);

        // 获取目录结构
        var $toc = content.init($ibook,_config);
        // 将TOC绑定到文章里面
        $ibook.find(".book-body").append($toc);

        // 是否默认隐藏
        if(_config.hide){
            $toc.addClass("state-min");
        };

        // 交互初始化
        action.init($toc);

        // 默认开启“电梯”效果
        if(_config.elevator){
            elevator.init($toc);// 初始化电梯
        }

    };


    // 创建目录
    var init = function() {
        var config = {};
        resetToc(config);
    };

    // 当刷新页面的时候，重新创建目录
    gitbook.events.bind("page.change", function() {
        init();
    });
});