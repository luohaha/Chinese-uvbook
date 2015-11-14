#Utilities

本章介绍的工具和技术对于常见的任务非常的实用。libuv吸收了[libev用户手册页](http://pod.tst.eu/http://cvs.schmorp.de/libev/ev.pod#COMMON_OR_USEFUL_IDIOMS_OR_BOTH)中所涵盖的一些模式，并在此基础上对API做了少许的改动。本章还包含了一些无需用完整的一章来介绍的libuv API。  

###Timers

当确定的时间到来时，定时器会启动回调函数。libuv的定时器还可以设定为，按时间间隔定时启动，而不是只启动一次。可以简单地使用超时时间timeout作为参数初始化一个定时器，还有一个可选参数repeat。定时器能在任何时间被终止。  

```
uv_timer_t timer_req;

uv_timer_init(loop, &timer_req);
uv_timer_start(&timer_req, callback, 5000, 2000);
```

上述操作会启动一个循环的定时器，它会在调用`uv_timer_start`后，5秒（timeout）启动回调函数，然后每隔2秒（repeat）循环启动回调函数。你可以使用：  

```
uv_timer_stop(&timer_req);
```

来停止定时器。这个函数也可以在回调函数中安全地使用。  

循环的间隔也可以随时定义，使用：  

```
uv_timer_set_repeat(uv_timer_t *timer, int64_t repeat);
```

