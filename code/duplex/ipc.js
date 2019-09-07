const { spawn } = require('child_process');

var child = spawn(
	// command
	"child.exe",
	// args
	[],
	// options
	{

		detached : false,

		/*
		 * fd 0 (stdin)   : Just ignore it.
		 * fd 1 (stdout)  : Pipe it for 3rd libraries that log their own stuff.
		 * fd 2 (stderr)  : Same as stdout.
		 * fd 3 (channel) : Channel fd.
		 */
		// ignore, pipe, inherit
		stdio : [ 'ignore', 'pipe', 'pipe' ]
});

if(child.stdout) {
	child.stdout.on('data', (buffer) =>
	{
		console.log(buffer.toString());
	});
}

if(child.stderr) {
	child.stderr.on('data', (buffer) =>
	{
		console.error(buffer.toString());
	});
}
