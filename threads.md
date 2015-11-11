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

libuv上的互斥量函数与pthread上存在一一映射。如果对pthread上的mutex不是很了解可以看[这里](https://computing.llnl.gov/tutorials/pthreads/)。

####libuv mutex functions

```
UV_EXTERN int uv_mutex_init(uv_mutex_t* handle);
UV_EXTERN void uv_mutex_destroy(uv_mutex_t* handle);
UV_EXTERN void uv_mutex_lock(uv_mutex_t* handle);
UV_EXTERN int uv_mutex_trylock(uv_mutex_t* handle);
UV_EXTERN void uv_mutex_unlock(uv_mutex_t* handle);
```

`uv_mutex_init`与`uv_mutex_trylock`在成功执行后，返回0，或者在错误时，返回错误码。  

如果libuv在编译的时候开启了调试模式，uv_mutex_destroy(), uv_mutex_lock() 和 uv_mutex_unlock()会在出错的地方调用`abort()`中断。类似的，uv_mutex_trylock()也同样会在错误发生时中断，除了EAGAIN和EBUSY这两个错误信息。  

递归地调用互斥量函数在某些系统平台上是支持的，但是你不能太过度依赖。因为例如在BSD上递归地调用互斥量函数会返回错误，比如你准备使用互斥量函数给一个已经上锁的临界区再次上锁的时候，就会出错。比如，像下面这个例子：  

```
uv_mutex_lock(a_mutex);
uv_thread_create(thread_id, entry, (void *)a_mutex);
uv_mutex_lock(a_mutex);
// more things here
```

在调试模式下，第二次调用`uv_mutex_lock()`会导致程序崩溃，或者是返回错误。  

#####NOTE
```
在linux中是支持递归上锁的，但是在libuv的API中并未实现。
```

####Lock

读写锁是更颗粒化的实现机制。两个读者线程可以同时从共享区中读取数据。当读者在读取数据时，写者不能获取写入。当写者在写入数据时，其他的写者或者读者都不能，写入或者读取共享区。读写锁在数据库操作中非常常见，下面是一个玩具式的例子：  

####ocks/main.c - simple rwlocks

```
#include <stdio.h>
#include <uv.h>

uv_barrier_t blocker;
uv_rwlock_t numlock;
int shared_num;

void reader(void *n)
{
    int num = *(int *)n;
    int i;
    for (i = 0; i < 20; i++) {
        uv_rwlock_rdlock(&numlock);
        printf("Reader %d: acquired lock\n", num);
        printf("Reader %d: shared num = %d\n", num, shared_num);
        uv_rwlock_rdunlock(&numlock);
        printf("Reader %d: released lock\n", num);
    }
    uv_barrier_wait(&blocker);
}

void writer(void *n)
{
    int num = *(int *)n;
    int i;
    for (i = 0; i < 20; i++) {
        uv_rwlock_wrlock(&numlock);
        printf("Writer %d: acquired lock\n", num);
        shared_num++;
        printf("Writer %d: incremented shared num = %d\n", num, shared_num);
        uv_rwlock_wrunlock(&numlock);
        printf("Writer %d: released lock\n", num);
    }
    uv_barrier_wait(&blocker);
}

int main()
{
    uv_barrier_init(&blocker, 4);

    shared_num = 0;
    uv_rwlock_init(&numlock);

    uv_thread_t threads[3];

    int thread_nums[] = {1, 2, 1};
    uv_thread_create(&threads[0], reader, &thread_nums[0]);
    uv_thread_create(&threads[1], reader, &thread_nums[1]);

    uv_thread_create(&threads[2], writer, &thread_nums[2]);

    uv_barrier_wait(&blocker);
    uv_barrier_destroy(&blocker);

    uv_rwlock_destroy(&numlock);
    return 0;
}
```

试着来执行一下上面的程序，看读者有多少次会同步执行。在有多个写者的时候，调度器会给予他们高优先级。  

我们同样会使用屏障来等待所有的线程都已经结束，最后再将屏障和锁一块回收。  

####Others

libuv同样支持[信号量](https://en.wikipedia.org/wiki/Semaphore_\(programming\))，[条件变量](https://en.wikipedia.org/wiki/Monitor_\(synchronization\)#Waiting_and_signaling)和[屏障](https://en.wikipedia.org/wiki/Barrier_\(computer_science\))，而且API的使用方法和pthread中的用法很类似。（如果你对上面的三个名词还不是很熟，可以看[这里](http://www.wuzesheng.com/?p=1668)，[这里](http://name5566.com/4535.html)，[这里](http://www.cnblogs.com/panhao/p/4653623.html)）。 

 还有，libuv提供了一个简单易用的函数`uv_once()`。多个线程调用这个函数，参数可以使用一个uv_once_t和一个指向特定函数的指针，最终只有一个线程能够执行这个特定函数。这个特定函数只会被调用一次：  
 
 ```
 /* Initialize guard */
static uv_once_t once_only = UV_ONCE_INIT;

int i = 0;

void increment() {
    i++;
}

void thread1() {
    /* ... work */
    uv_once(once_only, increment);
}

void thread2() {
    /* ... work */
    uv_once(once_only, increment);
}

int main() {
    /* ... spawn threads */
}
 ```

当所有的线程执行完毕，i==1。  

再libuv的v0.11.11版本里，推出了uv_key_t结构和操作[线程局部存储TLS](http://baike.baidu.com/view/598128.htm)的API，使用方法同样和pthread类似。  

###libuv work queue

`uv_queue_work()`是一个便利的函数，它使得一个应用程序能够在不同的线程运行任务，当任务完成后，回调函数将会被触发。它看起来好像很简单，但是它真正吸引人的地方在于它能够使得任何第三方的库都能以event-loop的方式执行。当使用event-loop的时候，最重要的是不能让loop线程阻塞，或者是执行高cpu占用的程序，因为这样会使得loop慢下来，loop event的高效特性也不能得到很好地发挥。  

然而，有很多现存的程序都带有阻塞的特性(比如最常见的I/O)