#Basics of libuv

libuv强制使用异步的，事件驱动的编程风格。它的核心工作是提供一个event-loop，还有基于I/O和其它事件通知的回调函数。libuv还提供了一些核心工具，例如定时器，非阻塞的网络支持，异步文件系统访问，子进程等。  

###Event loops

在事件驱动编程中，程序会关注每一个事件，并且对每一个事件的发生做出反应。libuv会负责将来自操作系统的事件收集起来，或者监视其他来源的事件。这样，用户就可以注册回调函数，回调函数会在事件发生的时候被调用。event-loop会一直保持运行状态。用伪代码描述如下：  

```
while there are still events to process:
    e = get the next event
    if there is a callback associated with e:
        call the callback
```

举几个事件的例子：  
* 准备好被写入的文件。  
* 包含准备被读取的数据的socket。  
* 超时的定时器。  

event-loop最终会被`uv_run()`启动－当使用libuv时，最后都会调用的函数。  

系统编程中最经常处理的一般是输入和输出，而不是一大堆的数据处理。问题在于传统的输入／输出函数(例如`read`，`fprintf`)都是阻塞式的。实际上，向文件写入数据，从网络读取数据所花的时间，对比cpu的处理速度差得太多。任务没有完成，函数是不会返回的，所以你的程序在这段时间内什么也做不了。对于需要高性能的的程序来说，这是一个主要的障碍。  

其中一个标准的解决方案是使用多线程。每一个阻塞的I/O操作都会被分配到各个线程中（或者是使用线程池）。当某个线程一旦阻塞，处理器就可以调度处理其他需要cpu资源的线程。  

但是libuv使用了另外一个解决方案，那就是异步，非阻塞。大多数的现代操作系统提供了基于事件通知的子系统。例如，一个正常的socket上的`read`调用会发生阻塞，直到发送方把信息发送过来。但是，实际上程序可以请求操作系统监视socket事件的到来，并将这个事件通知放到事件队列中。这样，程序就可以很简单地检查事件是否到来（可能此时正在使用cpu做数值处理的运算），并及时地获取数据。说libuv是异步的，是因为程序可以在一头表达对某一事件的兴趣，并在另一头获取到数据（对于时间或是空间来说）。它是非阻塞是因为应用程序无需在请求数据后等待，可以自由地做其他的事。libuv的事件循环方式很好地与该模型匹配, 因为操作系统事件可以视为另外一种libuv事件. 非阻塞方式可以保证在其他事件到来时被尽快处理。  

#####Note
我们不需要关心I/O在后台是如何工作的，但是由于我们的计算机硬件的工作方式，线程是处理器最基本的执行单元，libuv和操作系统通常会运行后台/工作者线程, 或者采用非阻塞方式来轮流执行任务。  

Bert Belder，一个libuv的核心开发者，通过一个短视频向我们解释了libuv的架构和它的后台工作方式。如果你之前没有接触过类似libuv，libev，这个视频会非常有用。视频的网址是(https://youtu.be/nGn60vDSxQ4)。

包含了libuv的event-loop的更多详细信息的[文档](http://docs.libuv.org/en/v1.x/design.html#the-i-o-loop)。  

###HELLO WORLD

让我们开始写第一个libuv程序吧！它什么都没做，只是开启了一个loop，然后很快地推出了。  

####helloworld/main.c

```
#include <stdio.h>
#include <stdlib.h>
#include <uv.h>

int main() {
    uv_loop_t *loop = malloc(sizeof(uv_loop_t));
    uv_loop_init(loop);

    printf("Now quitting.\n");
    uv_run(loop, UV_RUN_DEFAULT);

    uv_loop_close(loop);
    free(loop);
    return 0;
}
```

这个程序会很快就退出了，因为没有可以很处理的事件。一个libuv必须时刻监视着