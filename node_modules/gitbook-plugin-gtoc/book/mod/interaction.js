/**[Public]
 * 定义目录的交互，诸如交互、快捷键
 * 
 */
define([
    "jQuery",
    "Mousetrap"
], function($, Mousetrap){
    // $toc的一些交互
    var init = function($toc) {
        // 定义快捷键t，收缩/展现目录
        Mousetrap.bind(['t'], function(e) {
            $toc.toggleClass("state-min");
            return false;
        });

        // 定义快捷键h，显示/隐藏目录
        Mousetrap.bind(['h'], function(e) {
            $toc.toggleClass("state-hide");
            return false;
        });

        // 点击shrink按钮，改变状态
        $toc.find(".j-toggle-menu").on("click",function(){
            $toc.toggleClass("state-min");
        });

        // 点击回到顶部按钮
        $toc.find(".j-scrollup").on("click",function(){
            // 当宽度大于1240时添加动画，body-inner是固定高度的
            // 当宽度小于1240时添加动画，body-inner是变高度，book-body是固定高度的
            $(".body-inner,.book-body").animate({scrollTop:0},'1000',"linear");
        });

        // hover的时候更改名字
        $toc.find(".gtoc-menu-min .word").mouseenter(function(){
            $(this).parent().addClass("state-hover");
        }).mouseleave(function(){
            $(this).parent().removeClass("state-hover");
        });


        // 更改宽口的大小
        // console.log($toc.find(".gitbook-table-of-contents").height());      
        var height_toc = $toc.find(".gtoc-menu").height();

        // 当窗口高度小于内容的时候，添加.state-scroll
        // 这样目录就能够出现滚动条了
        var toggleScroll = function(){
            if($(window).height() < height_toc){
                $toc.addClass("state-scroll");
            }else{
                $toc.removeClass("state-scroll");
            }
        }

        // 页面刚载入需要
        toggleScroll();
        
        // 响应页面伸缩事件
        $(window).on("resize",function(){
            toggleScroll();
        });


    };

    return {
        init: init
    };
});