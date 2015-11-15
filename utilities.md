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

它会在可能的时候发挥作用。如果上述函数是在回调函数中调用的，这意味着：  

* 如果定时器未设置为循环，这意味着定时器已经停止。需要先用`uv_timer_start`重新启动。  
* 如果定时器被设置为循环，那么下一次超时的时间已经被规划好了，所以在切换到新的间隔之前，旧的间隔还会发挥一次作用。  

函数：  

```
int uv_timer_again(uv_timer_t *)
```

用来重启定时器，相当于停止定时器，然后使用原先的timeout和repeat值来重新启动定时器。如果当该函数调用时，定时器未启动，则调用失败（错误码为`UV_EINVAL`）并且返回－1。  

下面的一节会出现使用定时器的例子。  

###Event loop reference count

event-loop在没有了活跃的handle之后，便会终止。整套系统的工作方式是：在handle增加时，event-loop的引用计数加1，在handle停止时，引用计数减少1。当然，libuv也允许手动地更改引用计数，通过使用：  

```
void uv_ref(uv_handle_t*);
void uv_unref(uv_handle_t*);
```

这样，就可以达到允许loop即使在有正在活动的定时器时，仍然能够推出。或者是使用自定义的uv_handle_t对象来使得loop保持工作。  

第二个函数可以和间隔循环定时器结合使用。你会有一个每隔x秒执行一次的垃圾回收器，或者是你的网络服务器会每隔一段时间向其他人发送一次心跳信号。如果你想要在你其他的监视器都退出后，终止程序。这时你就可以立即unref定时器，即便定时器这时是loop上唯一还在运行的监视器，你依旧可以停止`uv_run()`。  

它们同样会出现在nodejs中，如js的API中封装的libuv方法。每一个js的对象产生一个`uv_handle_t`（所有监视器的超类），同样可以被uv_ref和uv_unref。  

####ref-timer/main.c

```
uv_loop_t *loop;
uv_timer_t gc_req;
uv_timer_t fake_job_req;

int main() {
    loop = uv_default_loop();

    uv_timer_init(loop, &gc_req);
    uv_unref((uv_handle_t*) &gc_req);

    uv_timer_start(&gc_req, gc, 0, 2000);

    // could actually be a TCP download or something
    uv_timer_init(loop, &fake_job_req);
    uv_timer_start(&fake_job_req, fake_job, 9000, 0);
    return uv_run(loop, UV_RUN_DEFAULT);
}
```

首先初始化垃圾回收器的定时器，然后在立刻`unref`它。注意观察9秒之后，此时fake_job完成，程序会自动退出，即使垃圾回收器还在运行。  

####Idler pattern

空转的回调函数会在每一次的event-loop循环激发一次。空转的回调函数可以用来执行一些优先级较低的活动。比如，你可以向开发者发送应用程序的每日性能表现情况，以便于分析，或者是使用用户应用cpu时间来做[SETI](http://www.seti.org)运算:)。空转程序还可以用于GUI应用。比如你在使用event-loop来下载文件，如果tcp连接未中断而且当前并没有其他的事件，则你的event-loop会阻塞，这也就意味着你的下载进度条会停滞，用户会面对一个无响应的程序。面对这种情况，空转监视器可以保持UI可操作。  

####idle-compute/main.c

```
uv_loop_t *loop;
uv_fs_t stdin_watcher;
uv_idle_t idler;
char buffer[1024];

int main() {
    loop = uv_default_loop();

    uv_idle_init(loop, &idler);

    uv_buf_t buf = uv_buf_init(buffer, 1024);
    uv_fs_read(loop, &stdin_watcher, 0, &buf, 1, -1, on_type);
    uv_idle_start(&idler, crunch_away);
    return uv_run(loop, UV_RUN_DEFAULT);
}
```

上述程序中，我们将空转监视器和我们真正关心的事件排在一起。`crunch_away`会被循环地调用，直到输入字符并回车。然后程序会被中断很短的时间，用来处理数据读取，然后在接着调用空转的回调函数。  

####idle-compute/main.c

```
void crunch_away(uv_idle_t* handle) {
    // Compute extra-terrestrial life
    // fold proteins
    // computer another digit of PI
    // or similar
    fprintf(stderr, "Computing PI...\n");
    // just to avoid overwhelming your terminal emulator
    uv_idle_stop(handle);
}
```

###Passing data to worker thread

在使用`uv_queue_work`的时候，你通常需要给工作线程传递复杂的数据。解决方案是自定义struct，然后使用`uv_work_t.data`指向它。一个稍微的不同是必须让`uv_work_t`作为这个自定义struct的成员之一（把这叫做接力棒）。这么做就可以使得，同时回收数据和`uv_wortk_t`。  

```
struct ftp_baton {
    uv_work_t req;
    char *host;
    int port;
    char *username;
    char *password;
}
```

```
ftp_baton *baton = (ftp_baton*) malloc(sizeof(ftp_baton));
baton->req.data = (void*) baton;
baton->host = strdup("my.webhost.com");
baton->port = 21;
// ...

uv_queue_work(loop, &baton->req, ftp_session, ftp_cleanup);
```

现在我们创建完了接力棒，并把它排入了队列中。  

现在就可以随性所欲地获取自己想要的数据啦。  

```
void ftp_session(uv_work_t *req) {
    ftp_baton *baton = (ftp_baton*) req->data;

    fprintf(stderr, "Connecting to %s\n", baton->host);
}

void ftp_cleanup(uv_work_t *req) {
    ftp_baton *baton = (ftp_baton*) req->data;

    free(baton->host);
    // ...
    free(baton);
}
```

我们既回收了接力棒，同时也回收了监视器。  

###External I/O with polling

通常在使用第三方库的时候，需要应对他们自己的IO，还有保持监视他们的socket和内部文件。在此情形下，不可能使用标准的IO流操作，但需要讲第三方库整体地整合进event-loop中。这样的话，第三方库就必须允许你访问它的内部文件描述符，并且提供可以处理细微任务的函数。但是一些第三库并不允许你这么做，他们只提供了一个标准的阻塞IO函数，此函数会完成所有的工作并返回。在event-loop的线程直接使用它们是不明智的，而是应该使用libuv的工作线程。当然，这也意味着失去了对第三方库的颗粒化控制。  

libuv的`uv_poll`简单地监视了使用了操作系统的监控机制的文件描述符。从某方面说，libuv实现的所有的IO操作，的背后均有`uv_poll`的支持。无论操作系统何时监视到文件描述符的改变，libuv都会调用响应的回调函数。  

现在我们简单地实现一个下载管理程序，它会通过[libcurl](http://curl.haxx.se/libcurl/)来下载文件。我们不会直接控制libcurl，而是使用libuv的event-loop，通过非阻塞的异步的[多重接口](http://curl.haxx.se/libcurl/c/libcurl-multi.html)来处理下载，与此同时，libuv会监控IO的就绪状态。  

####uvwget/main.c - The setup

```
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <uv.h>
#include <curl/curl.h>

uv_loop_t *loop;
CURLM *curl_handle;
uv_timer_t timeout;
}

int main(int argc, char **argv) {
    loop = uv_default_loop();

    if (argc <= 1)
        return 0;

    if (curl_global_init(CURL_GLOBAL_ALL)) {
        fprintf(stderr, "Could not init cURL\n");
        return 1;
    }

    uv_timer_init(loop, &timeout);

    curl_handle = curl_multi_init();
    curl_multi_setopt(curl_handle, CURLMOPT_SOCKETFUNCTION, handle_socket);
    curl_multi_setopt(curl_handle, CURLMOPT_TIMERFUNCTION, start_timeout);

    while (argc-- > 1) {
        add_download(argv[argc], argc);
    }

    uv_run(loop, UV_RUN_DEFAULT);
    curl_multi_cleanup(curl_handle);
    return 0;
}
```

每种库整合进libuv的方式都是不同的。以libcurl的例子来说，我们注册了两个回调函数。socket回调函数`handle_socket`会在socket状态改变的时候被触发，因此我们不得不开始轮询它。`start_timeout`是libcurl用来告知我们下一次的超时间隔的，之后我们就应该不管当前IO状态，驱动libcurl向前。这些也就是libcurl能处理错误或驱动下载进度向前的原因。  

可以这么调用下载器：  

```
$ ./uvwget [url1] [url2] ...
```

我们可以把url当成参数传入程序。  

####uvwget/main.c - Adding urls

```
void add_download(const char *url, int num) {
    char filename[50];
    sprintf(filename, "%d.download", num);
    FILE *file;

    file = fopen(filename, "w");
    if (file == NULL) {
        fprintf(stderr, "Error opening %s\n", filename);
        return;
    }

    CURL *handle = curl_easy_init();
    curl_easy_setopt(handle, CURLOPT_WRITEDATA, file);
    curl_easy_setopt(handle, CURLOPT_URL, url);
    curl_multi_add_handle(curl_handle, handle);
    fprintf(stderr, "Added download %s -> %s\n", url, filename);
}
```

我们允许libcurl直接向文件写入数据。  

`start_timeout`会被libcurl立即调用。