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

`uv_process_t`只是作为句柄，所有的选择项都通过`uv_process_options_t`设置，为了简单地开始一个进程，你只需要设置file和args，file是要执行的程序，args是所需的参数（和c语言中main函数的传入参数类似）。因为`uv_spawn`在内部使用了[execvp]()，所以不需要提供绝对地址。遵从惯例，实际传入参数的数目要多于需要的参数，因为最后一个参数会被设为NULL。  

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

