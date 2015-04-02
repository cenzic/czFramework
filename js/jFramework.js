/**
 * This is the core of the jFramework. It handle all routing and control on the
 * page.
 */
(function($){
  var log = $.log.init("jFramework");
  var defaultOptions = {
    basePath: (function(){
      var path = window.location.pathname;
      path = (path.indexOf("index.html")!=-1) ? path.slice(0,-11) : path.slice(0,-1);
      return path;
    })(),
    container: "page_body",
    controller: "home",
    action: "index",
    actionHandler: function(){}// default action handler for any controller
                  // that action not defined.
  }

  var defaultRoute = (function(){
    return {
      currentUrl: window.location.protocol + "//" + window.location.host + window.location.pathname,
      baseUrl: window.location.protocol + "//" + window.location.host + defaultOptions.basePath,
      controller: "home",
      action: "index",
      params: {},
      getParams: {},
      postParams: {}
    }
  })();

  $.jf = {
    /**
     * resolve the current page state to get the template and model for
     * render the page.
     */
    bootstrap: function(options){
      if(!$.jFormat) throw "jFormat is the requirement dependency, please add it to the index template";

      $.extend(defaultOptions, options);
      //view helper move to helper.js

      // register window hash change event
      $(window).bind("hashchange",function(){
        if(cancelHashChange) return;
        console.log("hashchange");
        viewRender(getRoute());
      });

      // get route and initialize jFormat.
      var route = getRoute();
      console.log("route: %s", JSON.stringify(route));
      $.jFormat.init({
          baseUrl: route.baseUrl
      });

      //adding custom helper functions
      var helperSrc = route.baseUrl + "/js/helpers.js";
      var partialSrc = route.baseUrl + "/js/partial.js";
      var loadScript = sync(function(){
        $("#page_header").jFormat("#page_header_template");
        $("#page_footer").jFormat("#page_footer_template");
        viewRender(route);
      })
      addScript(partialSrc, loadScript);
      addScript(helperSrc, loadScript);
    },
    /**
     * This is the key function to handle all call backs actions is the
     * object contains all actions belongs to a controller.
     */
    controller: function(actions){
      console.log("controller called");
      controllers[currentControllerName] = actions;
    },
    ctrl:{
      filters:[],
      actionFilters: {},
      actions:{}
    },
    /**
     * wrapper to render a template directly from an action
     */
    renderTemplate: function(templateName, model){
      console.log("renderTemplate called");
      var route = getRoute(templateName);
      return function() {
        viewRender(route,model);
      }
    },
    /**
     * calling helper template from an action
     */
    helperTemplate: function(helperName,model){
      console.log("helperTemplate called");
      return function(){
        var template = "@templates/"+helperName;
        var id = $.util.guid();
        var wrapper = $("<div>");
        wrapper.attr("id",id);
        $("#"+defaultOptions.container).append(wrapper);
        wrapper.jFormat(template, model, function(formatted){
          console.log("formatted: %s", formatted);
          $("#"+id).html(formatted);
        });
      }
    },

    /**
     * Register helper templates to use shared accross the site.
     */
    registerHelperTemplate: function(helperTemplates){
      console.log("registerHelperTemplate");
    },

    // ============================== Jquery Ajax wrapper
    // ======================
    /* wraper of jquery */
    get: function(){
      var args = parseArguments(arguments);
      var override = function(d,status,ajax){
        console.log("override success | template: %s", ajax.template);
        var ret = args.success(d,status,ajax);
        processAction(ret,ajax.template);
      }
      return $.get(args.url,args.data,override,args.dataType);
    },
    post: function(url,data,success,dataType){
      return $.post(url,data,success,dataType);
    },
    put: function(url,data,success,dataType){
      return $.ajax(url,{
        type:"put",
        data:data,
        success:success,
        dataType:dataType
      });
    },
    patch: function(url,data,success,dataType){
      return $.ajax(url,{
        type:"patch",
        data:data,
        success:success,
        dataType:dataType
      });
    },
    "delete": function(url,data,success,dataType){
      return $.ajax(url,{
        type:"delete",
        data:data,
        success:success,
        dataType:dataType
      });
    },
    ajax:function(url,settings){
      return $.ajax(url,settings);
    },
    getHashPath: getHashPath, //expose to helper function.
    defaultRoute: defaultRoute,
    defaultOptions: defaultOptions,
    viewRender: viewRender
  };

  $.fn.refresh = function(){
    $.jf.refresh()
  };
  // ============== private properties ========================


  var cancelHashChange = false;
  /**
   * This is the collections of all controller registered on the page.
   */
  var controllers = {};
  var currentControllerName = "";

  var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
  var ARGUMENT_NAMES = /([^\s,]+)/g;


  // ========================private functions ============================

  /**
   * handle custom form submission
   */
  function formSubmitHandler(event){
    console.log("formSubmitHandler");
    event.preventDefault();
    var form = event.target || event.srcElement;
    var route = getFormRoute(form);
    var method = form.method.toLowerCase();
    switch(method){
    case "get":
      location.hash = getHashPath(route);
      break;
    case "post":
    case "put":
      // set cancelHashChange to skip the renderView on hashChange and
      // then proccess it manually.
      cancelHashChange = true;
      location.hash = getHashPath(route);
      sessionStorage["currentPostParams"] = JSON.stringify(route.postParams);
      setTimeout(function(){
        viewRender(route);
        cancelHashChange = false;
      },0);
    case "path":
    case "delete":
    case "option":
    default:
      break;
    }
    return false;
  }
  /**
   * parsing the form to get parameters for get and post
   *
   * @param form
   * @returns
   */
  function getFormRoute(form){
    var hash = getHashFromUrl(form.action);
    console.log("getFormRoute | hash: %s", hash);
    var route = getRoute(hash);
    var params = {};
    for(var i=0;i<form.elements.length;i++){
      var e = form.elements[i];
      var key = e.name;
      var type = e.type.toLowerCase();
      if(!key || ((type=="radio" || type=="checkbox") && !e.checked)) continue;
      var value = e.value;
      updateParamItem(params,key,value,false);
    }
    console.log("params: %s", JSON.stringify(params));
    $.extend(route.params,params);
    if(form.method.toLowerCase() == "get"){
      $.extend(route.getParams,params);
    }
    else{
      // create post params
      route.postParams = params;
    }
    console.log("updated route: %s", JSON.stringify(route));
    return route;
  }
  /**
   * parsing arguments for calling action with predefined params
   *
   * @param args
   */
  function parseArguments(args){
    var data,success,dataType;
    if(typeof(args[1])=="object"){
      data = args[1];
      if(typeof(args[2])=="function"){
        success = args[2];
        if(typeof(args[3])=="string"){
          dataType = args[3];
        }
      }
    }else if(typeof(args[1])=="function"){
      success = args[1];
      if(typeof(args[2])=="string"){
        dataType = args[2];
      }
    }
    else if(typeof(args[1])=="string"){
      dataType = args[1];
    }
    return {
      url:args[0],
      data: data,
      success: success,
      dataType: dataType
    }
  }

  function getHashFromUrl(url){
    var a = document.createElement('a');
    a.href = url;
    return a.hash.substr(1);
  }
  /**
   * This is the key function or entry point to render a view route, model,
   * callback
   */
  function viewRender(route, model, callback){
    console.log("viewRender: %s", JSON.stringify(route));
    var template = getTemplate(route);
    loadController(route.controller, function(){
      var ret = model;
      if(!ret){
        var handler = controllers[route.controller][route.action] || controllers[route.controller]["_defaultAction"] || defaultOptions.actionHandler;
        var args = getParamNames(handler);
        var vals = [];
        for(var i=0; i<args.length; i++){
          var val = route.params[args[i]];
          vals.push(val)
        }
        ret = handler.apply($.jf,vals);
      }
      processAction(ret,template,route,callback);
    });
  }
  /**
   * handler call after each view loaded.
   *
   * @param formmated
   */
  function postRender(formmated){
    console.log("postRender");
    var jObj = $(this);
    // adding handler for forms
    jObj.find("form").bind("submit",formSubmitHandler);
    var id= jObj.attr("id");
    $.partial.postRender(id);
  }
  function processAction(ret,template,route,callback){
    console.log("processAction ret: %s, callback: %s", typeof(ret), typeof(callback));
    var model = {};
    // renderTemplate for helperTemplate
    var type=typeof(ret);
    if(type == "function"){
      console.log("type==function calling function");
      ret(route);
    }
    else{
      if(type == "object") {
        if(ret.success && typeof(ret.success)=="function"){// this is
                                  // jquery
                                  // ajax
          console.log("set template: %s", template);
          ret.template = template;
          return;
        }
        console.log("type==object update model");
        model = ret;
      }
      else if(type == "string"){// assume it is text.
        console.log("type==string update template")
        template = ret;
      }
      else if(ret===undefined){
        console.log("container: %s, template: %s, model: %s",defaultOptions.container, template, JSON.stringify(model))
      }
      else if(ret===null){
        return;
      }

      if(callback){
        $("<div/>").jFormat(template, model, callback);
      }
      else{
        $("#"+defaultOptions.container).jFormat(template,model, postRender);
      }
      // skip null
    }
  }

  function getHashPath(route){
    var queryString = getQueryString(route.getParams);
    var controller = route.controller || defaultOptions.controller;
    var action = route.action || defaultOptions.action;
    // return defaultRoute.currentUrl + "#" + controller + "/" + action +
    // (queryString ? ("?"+queryString) : "");
    return "#" + controller + "/" + action + (queryString ? ("?"+queryString) : "");
  }

  function getQueryString(params){
    if(!params) return "";
    var arr = [];
    for(var key in params){
      var param = params[key];
      if($.isArray(param)){
        for(var i=0;i<param.length;i++){
          var val = encodeURIComponent(param[i]);
          arr.push(key + "=" + val);
        }
      }else{
        var val = encodeURIComponent(param);
        arr.push(key + "=" + val);
      }
    }
    return arr.join("&");
  }
  /**
   * get argument names of a callback function.
   */
  function getParamNames(func) {
    var fnStr = func.toString().replace(STRIP_COMMENTS, '')
    var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES)
    if(result === null)
       result = []
    return result
  }
  /**
   * fetch the remote controller and keep track of it so it will not be loaded
   * twice.
   */
  function loadController(controllerName, callback){
    $.jf.currentControllerName = currentControllerName = controllerName;
    if(controllers[controllerName]!=undefined) {
      // console.log("controller already loaded");
      callback();
      return;
    }

    controllers[controllerName] = null;
    var filePath = defaultRoute.baseUrl + "/controllers/" + controllerName + ".js";
    addScript(filePath, function(){
      registerController(controllerName);
      callback();
    });
  }

  function addScript(src,callback){
    var script = document.createElement("script");
    script.type="text/javascript";
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
  }
  /**
   * when controller script loaded, $.jf will be set some value;
   * this function will read the value, set to the controllers,
   * then reset the temporary $.jf;
   * @returns
   */
  function registerController(name){
    controllers[name] = $.jf.actions;
  }
  /**
   * return route object base on current url it should answer what is the
   * controller, and the view. format for the hash
   * controller/action?param1=value1&param2=value2
   */
  function getRoute(hash){
    var hash = hash || window.location.hash.substring(1);
    if(!hash) {
      console.log("hash is not defined use defaultRoute: %s", JSON.stringify(defaultRoute));
      return defaultRoute;
    }
    var i = hash.indexOf("?");
    var path = paramStr = "";
    var route = $.extend({},defaultRoute);
    if(i!=-1){
      path = hash.substr(0,i);
      paramStr = hash.substr(i+1);
    }else{
      path = hash;
    }

    var pathArr = path.split('/');
    console.log("path: %s", path);
    if(pathArr.length==1){
      route.controller = currentControllerName;
      route.action = pathArr[0] || route.action;
    }else{
      route.controller = pathArr[0] || route.controller;
      route.action = pathArr[1] || route.action;
    }
    route.params = getParams(paramStr);
    console.log("route: %s", JSON.stringify(route));
    return route;
  }

  function getParams(paramStr){
    paramStr = $.trim(paramStr);
    if(!paramStr) return {};
    var params = {};
    var arr = paramStr.split('&');
    for(var i = 0; i < arr.length; i++){
      var tmp = arr[i].split('=');
      var key = tmp[0],
        value = tmp[1];
      if(!tmp[0]) continue;
      updateParamItem(params,key,value,true);
    }
    return params;
  }

  function updateParamItem(params,key,value,isEncoded){
    value = isEncoded ? decodeURIComponent(value): value;
    if(key in params){// convert it to array
      if($.isArray(params[key])){
        params[key].push(value);
      }
      else{
        params[key] = [params[key],value];
      }
    }else{
      params[key]=value;
    }
  }

  function getTemplate(route){
    var controller = route.controller || defaultOptions.controller;
    var action = route.action || defaultOptions.action;

    return "@" + "views" + "/" + controller + "/" + action;
  }

  var syncCount = 0;
  function sync(callback, args){
    syncCount++;
    console.log("get here");
    return function(){
      console.log("get here");
      log.debug("syncCount: %s", syncCount);
      syncCount--;
      if(syncCount==0){
        callback.call(this, args);
      }
    }
  }

})(jQuery);
