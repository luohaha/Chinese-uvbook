#Processes

libuv提供了相当多的子进程管理函数，并且是跨平台的，还允许使用stream，或者说pipe完成进程间通信。  

在UNIX中有一个共识，就是进程只做一件事，并把它做好。因此，进程通常通过创建子进程来完成不同的任务（例如，在shell中使用pipe）。 一个多进程的，通过消息通信的模型，总比多线程的，共享内存的模型要容易理解得多。  

当前一个比较常见的反对事件驱动编程的原因在于，其不能很好地利用现代多核计算机的优势。一个多线程的程序，内核可以将线程调度到不同的cpu核心中执行，以提高性能。但是一个event-loop的程序只有一个线程。实际上，工作区可以被分配到多进程上，每一个进程执行一个event-loop，然后每一个进程被分配到不同的cpu核心中执行。  

###Spawning child processes

一个最简单的用途是，你想要开始一个进程，然后知道它什么时候终止。需要使用`uv_spawn`完成任务：  

####spawn/main.c

```
uv_loop_t *loop;
uv_process_t child_req;
uv_process_options_t options;
int main() {
    loop = uv_default_loop();

    char* args[3];
    args[0] = "mkdir";
    args[1] = "test-dir";
    args[2] = NULL;

    options.exit_cb = on_exit;
    options.file = "mkdir";
    options.args = args;

    int r;
    if ((r = uv_spawn(loop, &child_req, &options))) {
        fprintf(stderr, "%s\n", uv_strerror(r));
        return 1;
    } else {
        fprintf(stderr, "Launched process with ID %d\n", child_req.pid);
    }

    return uv_run(loop, UV_RUN_DEFAULT);
}
```

#####Note

由于上述的options是全局变量，因此被初始化为0。如果你在局部变量中定义options，请记得将所有没用的域设为0   

```
uv_process_options_t options = {0};
```

`uv_process_t`只是作为句柄，所有的选择项都通过`uv_process_options_t`设置，为了简单地开始一个进程，你只需要设置file和args，file是要执行的程序，args是所需的参数（和c语言中main函数的传入参数类似）。因为`uv_spawn`在内部使用了[execvp](http://man7.org/linux/man-pages/man3/exec.3.html)，所以不需要提供绝对地址。遵从惯例，实际传入参数的数目要多于需要的参数，因为最后一个参数会被设为NULL。  

在函数`uv_spawn`被调用之后，`uv_process_t.pid`会包含子进程的id。  

回调函数`on_exit()`会在被调用的时候，传入exit状态和导致exit的信号。  

####spawn/main.c

```
void on_exit(uv_process_t *req, int64_t exit_status, int term_signal) {
    fprintf(stderr, "Process exited with status %" PRId64 ", signal %d\n", exit_status, term_signal);
    uv_close((uv_handle_t*) req, NULL);
```

在进程关闭后，需要回收handler。  

###Changing process parameters

在子进程开始执行前，你可以通过使用`uv_process_options_t`设置运行环境。  

###Change execution directory

设置`uv_process_options_t.cwd`，更改相应的目录。  

###Set environment variables

`uv_process_options_t.env`的格式是以null为结尾的字符串数组，其中每一个字符串的形式都是`VAR=VALUE`。这些值用来设置进程的环境变量。如果子进程想要继承父进程的环境变量，就将`uv_process_options_t.env`设为null。  

###Option flags

通过使用下面标识的按位或的值设置`uv_process_options_t.flags`的值，可以定义子进程的行为：  

*`UV_PROCESS_SETUID`-将子进程的执行用户id（UID）设置为`uv_process_options_t.uid`中的值。  
*`UV_PROCESS_SETGID`-将子进程的执行组id(GID)设置为`uv_process_options_t.gid`中的值。  
只有在unix系的操作系统中支持设置用户id和组id，在windows下设置会失败，`uv_spawn`会返回`UV_ENOTSUP`。 
*`UV_PROCESS_WINDOWS_VERBATIM_ARGUMENTS`-  
*`UV_PROCESS_DETACHED`-使得子进程脱离父进程，这样子进程就可以在父进程退出后继续进行。请看下面的例子：  

###Detaching processes

使用标识`UV_PROCESS_DETACHED`可以启动守护进程(daemon)，或者是使得子进程从父进程中独立出来，这样父进程的退出就不会影响到它。   

####detach/main.c

```
int main() {
    loop = uv_default_loop();

    char* args[3];
    args[0] = "sleep";
    args[1] = "100";
    args[2] = NULL;

    options.exit_cb = NULL;
    options.file = "sleep";
    options.args = args;
    options.flags = UV_PROCESS_DETACHED;

    int r;
    if ((r = uv_spawn(loop, &child_req, &options))) {
        fprintf(stderr, "%s\n", uv_strerror(r));
        return 1;
    }
    fprintf(stderr, "Launched sleep with PID %d\n", child_req.pid);
    uv_unref((uv_handle_t*) &child_req);

    return uv_run(loop, UV_RUN_DEFAULT);
```

记住一点，就是handle会始终监视着子进程，所以你的程序不会退出。`uv_unref()`会解除handle。  

###Sending signals to processes

libuv打包了unix标准的`kill(2)`系统调用，并且在windows上实现了一个类似用法的调用，但要注意：所有的`SIGTERM`，`SIGINT`和`SIGKILL`都会导致进程的中断。`uv_kill`函数如下所示：  

```
uv_err_t uv_kill(int pid, int signum);
```

对于用libuv启动的进程，应该使用`uv_process_kill`终止，它会以`uv_process_t`作为第一个参数，而不是pid。当使用`uv_process_kill`后，记得使用`uv_close`关闭`uv_process_t`。  

###Signals

libuv对unix信号和一些[windows下类似的机制](http://docs.libuv.org/en/v1.x/signal.html#signal)，做了很好的打包。  

使用`uv_signal_init`初始化一饿handle，然后将它与loop关联。为了使用handle监听特定的信号，使用`uv_signal_start()`函数。每一个handle只能与一个信号关联，后续的`uv_signal_start`会覆盖前面的关联。使用`uv_signal_stop`终止监听。下面的这个小例子展示了各种用法：  

####signal/main.c

```
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <uv.h>

uv_loop_t* create_loop()
{
    uv_loop_t *loop = malloc(sizeof(uv_loop_t));
    if (loop) {
      uv_loop_init(loop);
    }
    return loop;
}

void signal_handler(uv_signal_t *handle, int signum)
{
    printf("Signal received: %d\n", signum);
    uv_signal_stop(handle);
}

// two signal handlers in one loop
void thread1_worker(void *userp)
{
    uv_loop_t *loop1 = create_loop();

    uv_signal_t sig1a, sig1b;
    uv_signal_init(loop1, &sig1a);
    uv_signal_start(&sig1a, signal_handler, SIGUSR1);

    uv_signal_init(loop1, &sig1b);
    uv_signal_start(&sig1b, signal_handler, SIGUSR1);

    uv_run(loop1, UV_RUN_DEFAULT);
}

// two signal handlers, each in its own loop
void thread2_worker(void *userp)
{
    uv_loop_t *loop2 = create_loop();
    uv_loop_t *loop3 = create_loop();

    uv_signal_t sig2;
    uv_signal_init(loop2, &sig2);
    uv_signal_start(&sig2, signal_handler, SIGUSR1);

    uv_signal_t sig3;
    uv_signal_init(loop3, &sig3);
    uv_signal_start(&sig3, signal_handler, SIGUSR1);

    while (uv_run(loop2, UV_RUN_NOWAIT) || uv_run(loop3, UV_RUN_NOWAIT)) {
    }
}

int main()
{
    printf("PID %d\n", getpid());

    uv_thread_t thread1, thread2;

    uv_thread_create(&thread1, thread1_worker, 0);
    uv_thread_create(&thread2, thread2_worker, 0);

    uv_thread_join(&thread1);
    uv_thread_join(&thread2);
    return 0;
}
```

#####Note

`uv_run(loop, UV_RUN_NOWAIT)`和`uv_run(loop, UV_RUN_ONCE)`非常像，因为它们都只处理一个事件。但是不同在于，UV_RUN_ONCE会在没有任务的时候阻塞，但是UV_RUN_NOWAIT会立刻返回。我们使用`NOWAIT`，这样才使得一个loop不会因为另外一个loop没有要处理的事件而挨饿。  

当向进程发送`SIGUSR1`，你会发现signal_handler函数被激发了4次，每次都对应一个`uv_signal_t`。然后signal_handler调用uv_signal_stop终止了每一个`uv_signal_t`，最终程序退出。对每个handler函数来说，任务的分配很重要。一个使用了多个event-loop的服务器程序，只要简单地给每一个进程添加信号SIGINT监视器，就可以保证程序在中断退出前，数据能够安全地保存。  

###Child Process I/O

一个正常的新产生的进程都有自己的一套文件描述符映射表，例如0，1，2分别对应`stdin`，`stdout`和`stderr`。有时候父进程想要将自己的文件描述符映射表分享给子进程。例如，你的程序启动了一个子命令，并且把所有的错误信息输出到log文件中，但是不能使用`stdout`。因此，你想要使得你的子进程和父进程一样，拥有`stderr`。在这种情形下，libuv提供了继承文件描述符的功能。在下面的例子中，我们会调用这么一个测试程序：  

####proc-streams/test.c

```
#include <stdio.h>

int main()
{
    fprintf(stderr, "This is stderr\n");
    printf("This is stdout\n");
    return 0;
}
```

实际的执行程序` proc-streams`在运行的时候，只向子进程分享stderr。在`stdio`域中的`uv_process_options_t`设置了子进程的文件描述符。首先设置`stdio_count`，定义文件描述符的个数。再使用`uv_stdio_container_t`队列来设置`uv_process_options_t.stdio`。  

```
typedef struct uv_stdio_container_s {
  uv_stdio_flags flags;

  union {
    uv_stream_t* stream;
    int fd;
  } data;
} uv_stdio_container_t;
```

上边的flag值可取多种。比如，如果你不打算使用，可以设置为`UV_IGNORE`。如果与stdio中对应的前三个文件描述符被标记为`UV_IGNORE`，那么它们会被重定向到`/dev/null`。  

因为我们想要传递一个已经存在的文件描述符，所以使用`UV_INHERIT_FD`。因此，fd被设为stderr。  

####proc-streams/main.c

```
int main() {
    loop = uv_default_loop();

    /* ... */

    options.stdio_count = 3;
    uv_stdio_container_t child_stdio[3];
    child_stdio[0].flags = UV_IGNORE;
    child_stdio[1].flags = UV_IGNORE;
    child_stdio[2].flags = UV_INHERIT_FD;
    child_stdio[2].data.fd = 2;
    options.stdio = child_stdio;

    options.exit_cb = on_exit;
    options.file = args[0];
    options.args = args;

    int r;
    if ((r = uv_spawn(loop, &child_req, &options))) {
        fprintf(stderr, "%s\n", uv_strerror(r));
        return 1;
    }

    return uv_run(loop, UV_RUN_DEFAULT);
}
```

这时你启动proc-streams，也就是在main中产生一个执行test的子进程，你只会看到“This is stderr”。你可以试着设置stdout也继承父进程。  

