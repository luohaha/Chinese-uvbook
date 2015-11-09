#Networking

在libuv中使用网络编程接口不会像在BSD上使用socket接口那么的麻烦，所有的都是非阻塞的，但是原理都是一样的。可以这么说，libuv提供了覆盖了恼人的，啰嗦的和底层的任务的抽象函数，比如使用BSD的socket结构的来设置socket，还有DNS查找，libuv还调整了一些socket的参数。  

在网络I/O中会使用到```uv_tcp_t```和```uv_udp_t```。   

###TCP
TCP是面向连接的，