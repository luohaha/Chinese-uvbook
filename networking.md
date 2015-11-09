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

