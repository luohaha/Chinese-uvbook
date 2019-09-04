#ifndef _UNISTD_H
#define _UNISTD_H

#define WIN32_LEAN_AND_MEAN

#include <windows.h>
#include <process.h>
#include <io.h>

#define random rand
inline void sleep(int s) { Sleep(s * 1000); }

#endif /* _UNISTD_H */