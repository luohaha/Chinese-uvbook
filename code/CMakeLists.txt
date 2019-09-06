list(APPEND samples
    cgi                                                                             
	detach                                                                          
	dns    
	duplex                                                                         
	helloworld                                                                      
	idle-basic                                                                      
	idle-compute                                                                    
	interfaces
	locks                                                                           
	multi-echo-server                                                               
	onchange                                                                        
	pipe-echo-server
	plugin
	proc-streams                                                                    
	progress                                                                        
	queue-cancel                                                                    
	queue-work                                                                      
	ref-timer                                                                       
	signal  
	spawn                                                                           
	tcp-echo-server                                                                 
	thread-create                                                                   
	tty                                                                             
	tty-gravity                                                                     
	udp-dhcp                                                                        
	uvcat                                                                           
	uvstop                                                                          
	uvtee                                                                           
	uvwget)

foreach(i ${samples})
	if(${i} STREQUAL plugin)
		add_executable(${i} ${i}/main.c ${i}/hello.c)
	elseif(${i} STREQUAL duplex)
		add_executable(${i} ${i}/main.cpp)
	else()
		add_executable(${i} ${i}/main.c)
	endif()
	add_dependencies(${i} uv_a)
	if(WIN32)
		target_include_directories(${i}
			PUBLIC ${CMAKE_SOURCE_DIR}/code/win_patch)
	endif()
	target_include_directories(${i}
		PUBLIC ${CMAKE_SOURCE_DIR}/libuv/include)
	target_link_libraries(${i} uv_a)
endforeach()


add_executable(tick cgi/tick.c)
if(WIN32)
	target_include_directories(tick
		PUBLIC ${CMAKE_SOURCE_DIR}/code/win_patch)
endif()


add_executable(worker multi-echo-server/worker.c)
add_dependencies(worker uv_a)
if(WIN32)
	target_include_directories(worker
		PUBLIC ${CMAKE_SOURCE_DIR}/code/win_patch)
endif()
target_include_directories(worker
	PUBLIC ${CMAKE_SOURCE_DIR}/libuv/include)
target_link_libraries(worker uv_a)

add_executable(test proc-streams/test.c)

add_dependencies(proc-streams test)
add_dependencies(multi-echo-server worker)
