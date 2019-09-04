cmake_minimum_required(VERSION 3.0)
project(uvbook)

set(CMAKE_COLOR_MAKEFILE ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

include(ExternalProject)

add_subdirectory(libuv)
add_subdirectory(code)

