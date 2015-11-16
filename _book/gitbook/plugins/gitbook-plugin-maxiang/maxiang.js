require(["gitbook"], function(gitbook) {
    gitbook.events.bind("page.change", function() {
        // do something
        var h2_list = document.body.querySelectorAll(".page-wrapper h2");

        if(!h2_list.length)return false;

        var html = '<span class="title">\u6587\u7AE0\u5BFC\u822A&nbsp;&nbsp;<label class="arrow">\u25b2</label></span><div id="js_right_nav_list">';

        var scrollList = [];

        for(var i=0;i<h2_list.length;i++){

        	var item = h2_list[i];

        	html += '<a href="javascript:void(0)" class="'+(i==0?'select':'')+'" data-top="'+item.offsetTop+'">'+item.innerHTML+'</a>';

        	scrollList.push(item.offsetTop);
        }

        html += '</div>';

        var nav = document.createElement("div");
        nav.className = "right-nav";
        nav.id = "js_right_nav";
        nav.innerHTML = html;

        document.body.querySelector(".page-wrapper").appendChild(nav);


        var navLinks = document.body.querySelectorAll("#js_right_nav a");

        //绑定事件
        nav.onclick = function(event){

        	if(event.target.tagName == "A"){

        		var top = event.target.getAttribute("data-top");

        		document.querySelector(".body-inner").scrollTop = parseInt(top,10) + 30;;

        		document.body.querySelector(".page-wrapper .select").className = "";

        		event.target.className = "select";
        	}
        }

        document.querySelector("#js_right_nav .title .arrow").onclick = function(){

            var dom = document.getElementById("js_right_nav_list");

            if(dom.style.display != "none"){
                dom.style.display = "none";
            }
            else dom.style.display = "block";
        }

        document.querySelector(".body-inner").onscroll = function(){

        	document.body.querySelector(".page-wrapper .select").className = "";

        	var top = this.scrollTop;

        	for(var i=0;i<scrollList.length;i++){

        		if(top <= scrollList[i])break;
        	}

        	if(i >= 1)i -= 1;

        	navLinks[i].className= "select";
        }

    });

    gitbook.events.bind("exercise.submit", function() {
        // do something
        //onsole.log("exercise.submit");
    });
});