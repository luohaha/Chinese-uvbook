GitBook Plugin - MaXiang Theme
==============

>	需要gitbook2.0以上版本

这是基于`www.maxiang.info`(马克飞象)站点的gitbook主题插件，

在此主题的基础上添加了目录导航功能，自动抓取`h2`标签，就是`markdown`中的`##`二级标题

安装使用: ```$ npm install gitbook-plugin-maxiang```

在使用gitbook项目的根路径中，添加 `book.json`，内容如下：

```
{
"plugins": [
        "maxiang"
    ]
}
```