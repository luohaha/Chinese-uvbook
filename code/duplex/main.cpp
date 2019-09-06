#include <uv.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32)
#include <process.h>
#else
#include <sys/types.h>
#include <unistd.h>
#endif

//*****************************************************************************
// Helpers

int GetPID() {
#if defined(_WIN32)
    return _getpid();
#else
    return getpid();
#endif
}

void OnExit(uv_process_t* process, int64_t exit_status, int term_signal) {
    fprintf(stdout, "[%i] parent on exit status: %lli sig:%i\n", GetPID(), exit_status, term_signal);
}

uv_process_t process_;
uv_pipe_t pipe_;


void onAlloc(uv_handle_t*,
            size_t suggested_size,
            uv_buf_t* buf) 
{
    void* b = ::malloc(suggested_size);
    *buf = uv_buf_init((char*)b, suggested_size);
}

void onRead(uv_stream_t* stream, ssize_t nread, const uv_buf_t* buf) 
{
    if (nread > 0) {
        fprintf(stdout, "[%i] OnRead: ", GetPID());
        fwrite(buf->base, 1, nread, stdout);
        fprintf(stdout, "\n");
    }
}

void onWrite(uv_write_t* req, int status) {
    fprintf(stdout, "[%i] onWrite. stopping loop \n", GetPID());
    free(req);
    uv_stop(uv_default_loop());
}

//*****************************************************************************
// Spawn itself as child process, inheriting stdout for output,
// creating a pipe on stderr to push data back from child process

void doSpawn(char* nm) {
    const char* args[3] = {
        nm,
        "-",
        NULL
    };
    uv_loop_t* loop = uv_default_loop();

    uv_process_options_t uvopts;
    memset(&uvopts, 0, sizeof(uvopts));
    uvopts.file = nm;
    uvopts.exit_cb = OnExit;
    uvopts.args = (char**)args;

    const size_t kNumSlots = 4;
    uv_stdio_container_t slots[kNumSlots];
    for (size_t i=0; i < kNumSlots; ++i) {
        memset(&slots[i], 0, sizeof(uv_stdio_container_t));
        slots[i].flags = UV_IGNORE;
    }

    slots[1].flags = UV_INHERIT_FD;
    slots[1].data.fd = 1;

    uv_pipe_init(loop, &pipe_, 0);
    
    // Duplex at windows must add UV_OVERLAPPED_PIPE flag(at *nix UV_OVERLAPPED_PIPE is empty operation)
    // If cancel this flag, child->parent uv_write will be deadlock when parent->child dont call uv_write
    const int kFlags = UV_CREATE_PIPE  | UV_READABLE_PIPE | UV_WRITABLE_PIPE | UV_OVERLAPPED_PIPE;
    slots[3].flags = static_cast<uv_stdio_flags>(kFlags);
    slots[3].data.stream = reinterpret_cast<uv_stream_t*>(&pipe_);

    uvopts.stdio_count = static_cast<int>(kNumSlots);
    uvopts.stdio = slots;

    int rval = uv_spawn(loop, &process_, &uvopts);
    fprintf(stdout, "[%i] uv_spawn %i\n", GetPID(), rval);

    uv_read_start(reinterpret_cast<uv_stream_t*>(&pipe_), onAlloc, onRead);

    uv_run(loop, UV_RUN_DEFAULT);

}

//*****************************************************************************
// open the file descriptor in the child process, first writing directly
// later as a pipe.

void doOpen() {

    // writing directly to file descriptor works cool and the gang
    fprintf(stderr, " Hello FD from [%i]", GetPID());

    // opening a pipe in child works as well
    uv_loop_t* loop = uv_default_loop();
    uv_pipe_init(loop, &pipe_, 0);
    int rval = uv_pipe_open(&pipe_, 3);
    fprintf(stdout, "[%i] uv_pipe_open %i\n", GetPID(), rval);

    rval = uv_read_start(reinterpret_cast<uv_stream_t*>(&pipe_), onAlloc, onRead);
    fprintf(stdout, "[%i] read started in child %i\n", GetPID(), rval);

    // writing on the pipe works fine on linux, but freezes on windows:
    uv_write_t* w = static_cast<uv_write_t*>(::calloc(1, sizeof(uv_write_t)));

    static const char  kPayload[]  = "Hello Pipe";
    uv_buf_t buf = uv_buf_init((char*)kPayload, strlen(kPayload));

    fprintf(stdout, "[%i] about to write\n", GetPID());
    rval = uv_write(w, reinterpret_cast<uv_stream_t*>(&pipe_), &buf, 1, onWrite);
    fprintf(stdout, "[%i] done write %i\n", GetPID(), rval);


    uv_run(loop, UV_RUN_DEFAULT);
}


int main (int argc, char** argv) {
    int rval = 0;
    if (argc == 1) {
        fprintf(stdout, "[%i] in parent\n", GetPID());
        doSpawn(argv[0]);
    } else {
        fprintf(stdout, "[%i] in child\n", GetPID());
        doOpen();
        rval = 1;
    }

    return rval;
}