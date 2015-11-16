/**[Public]
 * 导航电梯功能，可选
 * 
 */
define([
    "jQuery",
    "Mousetrap"
], function($, Mousetrap){

    /**[public]
     * 根据提供的ID数组
     * @param  {[Array]} navId 元素ID属性（带#号）数组
     * 
     * @return {[Array]}       返回对应的距离顶部数值
     */
    var getTopValue = function(navId,offset){
        var topValueSet = [];
        var offset = offset || 0; // 可能需要修正，比如要考虑头部高度
        // 循环遍历获取每个条目到顶部的距离值
        for(var i = 0;i<navId.length;i++){
            topValueSet.push(+$(''+navId[i]).offset().top + offset);
        }

        return topValueSet;
    };


    /**[public]
     * 获取该值所在的区间范围的索引值
     * @param  {[int]} value     数值
     * @param  {[Array]} valueSet 数值所在的数组
     * @param  {[int]} offset   偏移值
     * 
     * @return {[int]}          区间所在索引值
     */
    var getCurrentPos = function(value,valueSet,offset){
        var offset = offset || 0;
        var index = -1; // 最上面的区域定义index为-1
        var value = value + offset ; // 这里添加一个固定的值作为偏移
        for(var i = 0;i<valueSet.length;i++){
            if(value < valueSet[0]){
                return index + 1; // 为了视觉连贯，让在第一屏的时候也高亮第一个标签
            }else if(value > valueSet[valueSet.length-1]){
                return index+valueSet.length;
            }else if(value < valueSet[i] && valueSet[i-1] && value > valueSet[i-1]){
                return index+i;
            }
        }
      }   

    /**[public]
     * 
     * 初始化电梯组件
     * @param  {[jQuery]} $toc 目录对象
     * 
     * @return none     添加scroll事件，完成电梯功能
     */
    var init = function($toc) {

        // 所有的标题链接是存储在目录a标签里的
        var navId = [];
        var menu = $toc.find(".gtoc-menu");
        var link = menu.find("a");

        var scrollBody = $(".body-inner,.book-body");

        link.each(function(){

            var node = $(this);
            navId.push(node.attr("href"));

            // 为了防止出现"闪烁"问题，需要修改href属性
            node.data("href",node.attr("href"));
            node.attr("href","javascript:void(0);");
        });
        // 将所有标题距离顶部的距离放置在topValue数组中
        var topValueSet = getTopValue(navId,0); // 后面的数值用于修正


        // 获取当前点击的Index值
        menu.on("click","a",function(){
            var index = link.index(this); // 获取当前链接索引值
             // 滚动到目标地址
             scrollBody.animate({scrollTop:+topValueSet[index]},'1000',"linear");

             link.removeClass("state-current");
             $(this).addClass("state-current");
        });

      // 添加滚动事件，增加电梯
      scrollBody.on("scroll",function(){
          // 先清除掉所有的active样式
          link.removeClass("state-current");
          // 获取当前滚动条的距离
          var topValue = Math.max(scrollBody[0].scrollTop,scrollBody[1].scrollTop);// 获取实际滚动距离
          // 根据距离判断应当让哪个导航高亮
          var nIndex = getCurrentPos(topValue,topValueSet,40);
          $(link[nIndex]).addClass("state-current");
      });
    };


    return {
        init: init,
        getTopValue:getTopValue,
        getCurrentPos:getCurrentPos
    };
});