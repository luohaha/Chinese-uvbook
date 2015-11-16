// 根据配置文件构建目录
define([
    "jQuery"
], function($) {
    var content = {};


    /**[Private]
     * 根据tagName更新目录序号对象
     * @param  {[String]} name  当前元素名称，e.g. "h2"
     * @param  {[Object]} level 当前层级对象，e.g. {"l1":0,"l2":0,"order":""}
     * 
     * @return {[String]}       返回更新之后的level对象, e.g. {"l1":2,"l2":1,"order":"2.1"}
     */
    var updateLevel = function(name,level){
            if(name === "h2"){
                level.l1 += 1;
                level.l2 = 1;
                level.order = level.l1;
            }else{
                level.order = "" + level.l1 + "." +level.l2;
                level.l2 += 1;
            }
            return level;
    };


    /**[Private]
     * 将el元素提取成一行目录，字符串格式
     * @param {[String]} el         要编入目录的元素对象  e.g. "h2,h3"
     * @param {[Object]} titleLevel 当前层级对象          e.g. {"l1":0,"l2":0,"order":""}
     *
     * @returns {[String]}
     *        e.g. 
     *         <a href="#gtoc-title-49" class="gtoc-level gtoc-level-h2">
     *             <i class="levelNum">1、</i>
     *             Getting Started
     *         </a>
     */
    var addSubTitle = function(el,titleLevel){
         var newLine, title, nId; // 获取标题所需要的内容和连接

            title = el.text();

            // 使用jQuery的guid保证唯一
            nId = "gtoc-title-" + ($.guid++);//创建新的hrefID
            el.attr("id",nId);// 重新给节点赋值Id
            el.addClass("gtoc-header");

            // 每一行链接的字符串，使用tagName创建层级类名
            newLine =
                  "<a href='#" + nId + "' class='gtoc-level gtoc-level-"+name+"'>" +
                  "<i class='levelNum'>"+titleLevel.order+"、</i>" + 
                    title +
                  "</a>";

            return newLine;
    }       


    /**[Public]
     * 内容初始化，构建目录
     * @param  {[jQuery]} $book     标准的book对象
     * @param  {[JSON]} config      配置项             e.g. {"el":"h2,h3"}
     * 
     * @return {[String]}           完整的目录字符串
     */
    content.init = function($book,config){

        // 遍历文章主题
        var $page = $book.find(".page-inner .normal");

        // 默认抽取h2,h3标题
        // 定义toc字符串的“头部”
        var toc = "<nav role='navigation'>" +
                      "<div class='gitbook-table-of-contents'>"+
                          "<div class='gtoc-menu'>"+      
                          "<h2>目录</h2>";

        var titleLevel = {"l1":0,"l2":0,"order":""};

        // var newLine, el, title, link; // 获取标题所需要的内容和连接
        var titleStr,el;

        // 遍历指定的选择器，拼接toc的“主体”
        $page.find(config.el).each(function(){
            el = $(this);

            // 获取tagName
            name = el[0].tagName.toLowerCase();

            // 根据tagName更新titleLevel
            titleLevel = updateLevel(name,titleLevel);

            // 根据el元素获取目录字符串
            titleStr = addSubTitle(el,titleLevel); 

            toc += titleStr; // 拼接到toc

        });

        // 拼接toc的“尾部”
        toc +=
            "</div>"+
            "</div>"+
                "<div class='gtoc-menu-min'>"+
                "<a href='javascript:void(0)' class='j-scrollup'><span class='word word-normal icon icon-top'></span><span class='word word-hover'>回到顶部</span></a>"+
                "<a title='快捷键(T)' href='javascript:void(0)' class='state-hover j-toggle-menu'><span class='word word-normal'>TOC</span><span class='word word-hover'>切换目录</span></a>"+
            "</div>"+
          "</nav>";

        return $(toc); // 返回目录结构jQuery对象
    } 

    return content;
});