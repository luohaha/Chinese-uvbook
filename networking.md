#Networking

在libuv中使用网络编程接口不会像在BSD上使用socket接口那么的麻烦，所有的都是非阻塞的，但是原理都是一样的。可以这么说，libuv提供了覆盖了恼人的，啰嗦的和底层的任务的抽象函数，比如使用BSD的socket结构的来设置socket，还有DNS查找，libuv还调整了一些socket的参数。  

在网络I/O中会使用到```uv_tcp_t```和```uv_udp_t```。   

###TCP
TCP是面向连接的，字节流协议，因此基于libuv的stream实现。  

####server
服务器端的建立流程如下：  
1.```uv_tcp_init```建立tcp句柄。  
2.```uv_tcp_bind```绑定。
3.```uv_listen```建立监听，当有新的连接到来时，激活调用回调函数。  
4.```uv_accept```接收链接。   
5.使用stream处理来和客户端通信。  

####tcp-echo-server/main.c - The listen socket
```
int main() {
    loop = uv_default_loop();

    uv_tcp_t server;
    uv_tcp_init(loop, &server);

    uv_ip4_addr("0.0.0.0", DEFAULT_PORT, &addr);

    uv_tcp_bind(&server, (const struct sockaddr*)&addr, 0);
    int r = uv_listen((uv_stream_t*) &server, DEFAULT_BACKLOG, on_new_connection);
    if (r) {
        fprintf(stderr, "Listen error %s\n", uv_strerror(r));
        return 1;
    }
    return uv_run(loop, UV_RUN_DEFAULT);
}
```

你可以调用```uv_ip4_addr()```函数来将ip地址和端口号转换为sockaddr_in结构，这样就可以被BSD的socket使用了。要想完成逆转换的话可以调用```uv_ip4_name()```。   
#####note
```
对应ipv6有类似的uv_ip6_*
```

大多数的设置函数是同步的，因为它们不会消耗太多cpu资源。到了```uv_listen```这句，我们再次回到回调函数的风格上来。第二个参数是待处理的连接请求队列－最大长度的请求连接队列。  

当客户端开始建立连接的时候，回调函数```on_new_connection```需要使用```uv_accept```去建立一个与客户端socket通信的句柄。同时，我们也要开始从流中读取数据。  

####tcp-echo-server/main.c - Accepting the client
```
void on_new_connection(uv_stream_t *server, int status) {
    if (status < 0) {
        fprintf(stderr, "New connection error %s\n", uv_strerror(status));
        // error!
        return;
    }

    uv_tcp_t *client = (uv_tcp_t*) malloc(sizeof(uv_tcp_t));
    uv_tcp_init(loop, client);
    if (uv_accept(server, (uv_stream_t*) client) == 0) {
        uv_read_start((uv_stream_t*) client, alloc_buffer, echo_read);
    }
    else {
        uv_close((uv_handle_t*) client, NULL);
    }
}
```

上述的函数集和stream的例子类似，在code文件夹中可以找到更多的例子。记得在socket不需要后，调用uv_close。如果你不需要接受连接，你甚至可以在uv_listen的回调函数中调用uv_close。

####client
当你在服务器端完成绑定／监听／接收的操作后，在客户端只要简单地调用```uv_tcp_connect```，它的回调函数和上面类似，具体例子如下：  

```
uv_tcp_t* socket = (uv_tcp_t*)malloc(sizeof(uv_tcp_t));
uv_tcp_init(loop, socket);

uv_connect_t* connect = (uv_connect_t*)malloc(sizeof(uv_connect_t));

struct sockaddr_in dest;
uv_ip4_addr("127.0.0.1", 80, &dest);

uv_tcp_connect(connect, socket, dest, on_connect);
```

当建立连接后，回调函数```on_connect```会被调用。回调函数会接收到一个uv_connect_t结构的数据，它的```handle```指向通信的socket。  

###UDP
用户数据报协议(User Datagram Protocol)提供无连接的，不可靠的网络通信。因此，libuv不会提供一个stream实现的形式，而是提供了一个```uv_udp_t```句柄（接收端），和一个```uv_udp_send_t```句柄（发送端），还有相关的函数。也就是说，实际的读写api与正常的流读取类似。下面的例子展示了一个从DCHP服务器获取ip的例子。  

#####note
```
你必须以管理员的权限运行udp-dhcp，因为它的端口号低于1024
```

