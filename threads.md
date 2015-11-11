#Threads
等一下！为什么我们要聊线程？事件循环（event loop）不应该是用来做web编程的方法吗？(如果你对event loop, 不是很了解，可以看[这里](http://www.ruanyifeng.com/blog/2014/10/event-loop.html))。哦，不不。线程依旧是处理器完成任务的重要手段。线程因此有可能会派上用场，虽然会使得你不得不艰难地应对各种原始的同步问题。  

线程会在内部使用，用来在执行系统调用时伪造异步的假象。libuv通过线程还可以使得你，或者程序，异步地执行一个阻塞的任务。方法就是大量地生成新线程，然后收集线程执行返回的结果。  

当下有两个占主导地位的线程库：windows下的线程实现和POSIX的[pthread](http://man7.org/linux/man-pages/man7/pthreads.7.html)。libuv的线程API与pthread的API在使用方法和语义上很接近。  

值得注意的是，libuv的线程模块是自成一体的。比如，其他的功能模块都需要依赖于event loop和回调的原则，但是线程并不是这样。它们是不受约束的，会在需要的时候阻塞，通过返回值产生信号错误，还有像接下来的这个例子所演示的这样，不需要在event loop中执行。  

因为线程API在不同的系统平台上，句法和语义表现得都不太相似，在支持程度上也各不相同。考虑到libuv的跨平台特性，libuv支持的线程API个数很有限。  

最后要强调一句：只有一个主线程，主线程上只有一个event loop。不会有其他与主线程交互的线程了。（除非使用`uv_async_send`）。  

###Core thread operations

下面这个例子不会很复杂，你可以使用`uv_thread_create()`开始一个线程，再使用`uv_thread_join()`等待其结束。  

####thread-create/main.c

```
int main() {
    int tracklen = 10;
    uv_thread_t hare_id;
    uv_thread_t tortoise_id;
    uv_thread_create(&hare_id, hare, &tracklen);
    uv_thread_create(&tortoise_id, tortoise, &tracklen);

    uv_thread_join(&hare_id);
    uv_thread_join(&tortoise_id);
    return 0;
}
```

#####TIP
```
uv_thread_t和unix下的pthread_t是对应的，但是多加了一个实现细节，
```
uv_thread_t的第二个参数指向了要执行的函数的地址。最后一个参数用来传递自定义的参数。最终，函数hare将在新的线程中执行，由操作系统调度。  

####thread-create/main.c

```
void hare(void *arg) {
    int tracklen = *((int *) arg);
    while (tracklen) {
        tracklen--;
        sleep(1);
        fprintf(stderr, "Hare ran another step\n");
    }
    fprintf(stderr, "Hare done running!\n");
}
```

uv_thread_join不像pthread_join那样，允许线线程通过第二个参数向父线程返回值。想要传递数值，必须使用线程间通信，不了解的可以看这节的最后部分。  

###Synchronization Primitives

因为本教程重点不在线程，因此我只罗列了libuv API中一些神奇的地方。剩下的你可以自行阅读pthread的手册。  

####Mutexes

libuv上的互斥量函数与pthread上存在一一映射。  

####libuv mutex functions

```
UV_EXTERN int uv_mutex_init(uv_mutex_t* handle);
UV_EXTERN void uv_mutex_destroy(uv_mutex_t* handle);
UV_EXTERN void uv_mutex_lock(uv_mutex_t* handle);
UV_EXTERN int uv_mutex_trylock(uv_mutex_t* handle);
UV_EXTERN void uv_mutex_unlock(uv_mutex_t* handle);
```

`uv_mutex_init`与`uv_mutex_trylock`在成功执行后，返回0，或者在错误时，返回错误码。  

如果libuv在编译的时候开启了调试模式，uv_mutex_destroy(), uv_mutex_lock() 和 uv_mutex_unlock()会在出错的地方调用`abort()`中断。类似的，uv_mutex_trylock()也同样会在错误发生时中断，除了EAGAIN和EBUSY。  

递归地调用互斥量函数在某些系统平台上是支持的，但是你不能太过度依赖。因为例如在BSD上递归地调用互斥量函数会返回错误，比如你准备su