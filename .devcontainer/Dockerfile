FROM centos

LABEL author="Nicolas Chow"
LABEL maintainer="stidio@163.com"
LABEL description="Minimum C/C++ Development Environment Based on Centos"

ARG PROXY="http://192.168.0.49:1080"

RUN yum update \
    && yum install --nogpgcheck -y gcc gcc-c++ make gdb valgrind wget \
    && yum autoremove -y \
    && yum clean all \
    && export http_proxy=${PROXY} \
    && export https_proxy=${PROXY} \
    && cd ~ \
    && wget https://github.com/Kitware/CMake/releases/download/v3.15.2/cmake-3.15.2-Linux-x86_64.tar.gz \
    && tar -xvzf cmake-3.15.2-Linux-x86_64.tar.gz && cp -rf cmake-3.15.2-Linux-x86_64/* /usr \
    && rm -rf cmake-3.15.2-Linux-x86_64 cmake-3.15.2-Linux-x86_64.tar.gz \
    && wget https://github.com/danmar/cppcheck/archive/1.88.tar.gz \
    && tar -xvzf 1.88.tar.gz && cd cppcheck-1.88 && make && make install && cd .. \
    && rm -rf cppcheck-1.88 1.88.tar.gz

ENV OS Linux