#Advanced event loops

libuv提供了非常多的控制event-loop的方法，你能通过使用多loop来实现很多有趣的功能。你还可以将libuv的event loop嵌入到其它基于event-loop的库中。比如，想象着一个基于Qt的UI，然后Qt的event-loop是由libuv驱动的，做着加强级的系统任务。  

###Stopping an event loop

`uv_stop()`用来终止event loop。loop会停止的最早时间点是在下次循环的时候，或者稍晚些的时候。这也就意味着在本次循环中已经准备被处理的事件，依然会被处理，`uv_stop`不会起到作用。当`uv_stop`被调用，在当前的循环中，loop不会被IO操作阻塞。上面这些说得有点玄乎，还是让我们看下所有控制流发生地方的`uv_run`调用：  

####src/unix/core.c - uv_run

```
int uv_run(uv_loop_t* loop, uv_run_mode mode) {
  int timeout;
  int r;
  int ran_pending;

  r = uv__loop_alive(loop);
  if (!r)
    uv__update_time(loop);

  while (r != 0 && loop->stop_flag == 0) {
    uv__update_time(loop);
    uv__run_timers(loop);
    ran_pending = uv__run_pending(loop);
    uv__run_idle(loop);
    uv__run_prepare(loop);

    timeout = 0;
    if ((mode == UV_RUN_ONCE && !ran_pending) || mode == UV_RUN_DEFAULT)
      timeout = uv_backend_timeout(loop);

    uv__io_poll(loop, timeout);
```

