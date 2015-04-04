/**
 * This is the core of the jFramework. It handle all routing and control on the
 * page.
 */
(function($){
  var log = $.log.init("jFramework","warn");
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
        log.debug("hashchange");
        if(cancelHashChange) {
          log.debug("cancelHashChange");
          return;
        }
        viewRender(getRoute());
      });

      // get route and initialize jFormat.
      var route = getRoute();
      log.debug("route: %s", JSON.stringify(route));
      $.jFormat.init({
          baseUrl: route.baseUrl
      });

      //adding custom helper functions
      var helperSrc = route.baseUrl + "/js/helpers.js";
      var partialSrc = route.baseUrl + "/js/partial.js";
      var syncCount = 2;
      var loadScript = function(){
        syncCount--;
        log.debug("reduce syncCount: %s", syncCount);
        if(syncCount>0) return;
        $("#page_header").jFormat("#page_header_template");
        $("#page_footer").jFormat("#page_footer_template");
        viewRender(route);
      };
      addScript(partialSrc, loadScript);
      addScript(helperSrc, loadScript);
    },
    /**
     * This is the key function to handle all call backs actions is the
     * object contains all actions belongs to a controller.
     */
    controller: function(actions){
      log.debug("controller called");
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
      log.debug("renderTemplate called");
      var route = getRoute(templateName);
      return function() {
        viewRender(route,model);
      }
    },
    /**
     * calling helper template from an action
     */
    helperTemplate: function(helperName,model){
      log.debug("helperTemplate | helperName: %s", helperName);
      return function(){
        var template = "@templates/"+helperName;
        var id = $.util.guid();
        var wrapper = $("<div>");
        wrapper.attr("id",id);
        var container = $("#"+defaultOptions.container);
        container.html("");
        container.append(wrapper);
        wrapper.jFormat(template, model, function(formatted){
          $("#"+id).html(formatted);
        });
      }
    },

    /**
     * Register helper templates to use shared accross the site.
     */
    registerHelperTemplate: function(helperTemplates){
      log.debug("registerHelperTemplate");
    },

    // ============================== Jquery Ajax wrapper
    // ======================
    /* wraper of jquery */
    get: function(){
      var args = parseArguments(arguments);
      var override = function(d,status,ajax){
        log.debug("override success | template: %s", ajax.template);
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
    log.debug("formSubmitHandler");
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
    log.debug("getFormRoute | hash: %s", hash);
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
    log.debug("params: %s", JSON.stringify(params));
    $.extend(route.params,params);
    if(form.method.toLowerCase() == "get"){
      $.extend(route.getParams,params);
    }
    else{
      // create post params
      route.postParams = params;
    }
    log.debug("updated route: %s", JSON.stringify(route));
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
    log.debug("viewRender: %j", route);
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
    log.debug("postRender");
    var jObj = $(this);
    // adding handler for forms
    jObj.find("form").bind("submit",formSubmitHandler);
    var id= jObj.attr("id");
    $.partial.postRender(id);
  }
  function processAction(ret,template,route,callback){
    log.debug("processAction ret: %s, callback: %s", typeof(ret), typeof(callback));
    var model = {};
    // renderTemplate for helperTemplate
    var type=typeof(ret);
    if(type == "function"){
      log.debug("type==function calling function");
      ret(route);
    }
    else{
      if(type == "object") {
        if(ret.success && typeof(ret.success)=="function"){// this is
                                  // jquery
                                  // ajax
          log.debug("set template: %s", template);
          ret.template = template;
          return;
        }
        log.debug("type==object update model");
        model = ret;
      }
      else if(type == "string"){// assume it is text.
        log.debug("type==string update template")
        template = ret;
      }
      else if(ret===undefined){
        log.debug("container: %s, template: %s, model: %s",defaultOptions.container, template, JSON.stringify(model))
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
      // log.debug("controller already loaded");
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

  function addScript(src, callback){
    var script = document.createElement("script");
    script.type="text/javascript";
    script.src = src;
    script.onload = function(){
      script.remove();
      callback();
    }
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
    log.debug("getRoute: %s", hash);
    var hash = hash || window.location.hash.substring(1);
    if(!hash) {
      log.debug("hash is not defined use defaultRoute: %j", defaultRoute);
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
    if(pathArr.length==1){
      route.controller = currentControllerName;
      route.action = pathArr[0] || route.action;
    }else{
      route.controller = pathArr[0] || route.controller;
      route.action = pathArr[1] || route.action;
    }
    route.params = getParams(paramStr);
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

})(jQuery);
