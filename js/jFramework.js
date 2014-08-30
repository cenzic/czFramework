/**
 * This is the core of the jFramework. It handle all routing and control on the
 * page.
 */
(function($){
  $.jf = {
    /**
     * resolve the current page state to get the template and model for
     * render the page.
     */
    bootstrap: function(options){
      if(!$.jFormat) throw "jFormat is the requirement dependency, please add it to the index template";

      $.extend(defaultOptions, options);

      // register helper functions for jFormat
      $.jFormat.addHelper(viewHelpers);

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

      // handle header and footer
      $("#page_header").jFormat("#page_header_template");
      $("#page_footer").jFormat("#page_footer_template");

      viewRender(route);
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
      var template = "@templates/"+helperName;
      return function(){
        $("#"+defaultOptions.container).jFormat(template,model,postRender);
      }
    },
    /**
     * Expose format function to use in actions
     */
    format: format,
    /**
     * Register helper templates to use shared accross the site.
     */
    registerHelperTemplate: function(helperTemplates){
      console.log("registerHelperTemplate");
    },
    /**
     * manually refresh a partial view with model provided.
     */
    refreshPartial: function(partialId, model){
      if(!partialId || !partialList[partialId]) return;
      partialList[partialId].refresh(model);
    },
    /**
     * set up auto refresh a partial view with model provided.
     */
    autoRefresh: function(partialId, time){
      if(!partialId || !partialList[partialId]) return;
      partialList[partialId].refreshTime = time;
      partialList[partialId].autoRefresh();
    },
    /**
     * set up auto refresh a partial view with model provided.
     */
    cancelRefresh: function(partialId){
      if(!partialId || !partialList[partialId]) return;
      partialList[partialId].cancelRefresh();
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
    delete: function(url,data,success,dataType){
      return $.ajax(url,{
        type:"delete",
        data:data,
        success:success,
        dataType:dataType
      });
    },
    ajax:function(url,settings){
      return $.ajax(url,settings);
    }
  };

  $.fn.refresh = function(){
    $.jf.refresh()
  };
  // ============== private properties ========================

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
  var cancelHashChange = false;
  /**
   * This is the collections of all controller registered on the page.
   */
  var controllers = {};
  var currentControllerName = "";

  var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
  var ARGUMENT_NAMES = /([^\s,]+)/g;

  var viewHelpers = {
    /**
     * first argument can be either string as action name or object
     * {action:actionName: controller: controllerName, params:{key value
     * pairs}} second argument is the text of the link;
     */
    link: function(routeInfo,text){
      console.log("viewHelpers.link called");
      if(arguments.length!=2) throw "Arguments Exception" + JSON.stringify(arguments);
      var route = getRouteHelper(routeInfo);
      return "<a href='"+getHashPath(route)+"'>"+text+"</a>";
    },
    hashPath: function(routeInfo){
      console.log("viewHelpers.hashPath called: %s", routeInfo);
      var route = getRouteHelper(routeInfo);
      console.log("route: %s", JSON.stringify(route));
      return getHashPath(route);
    },

    /**
     * Render partial will create an wrapper element to be render later.
     */
    renderPartial:function(){
      console.log("renderPartial called");
      var route = parseRenderPartialArgs(arguments);
      var partial = new PartialView(route);
      return partial.getWrapper();
    },



    /**
     * it's just a helper for jFormat partial render. the params is the
     * model for partialView
     */
    partialView:function(){
      var route = parsePartialViewArgs(arguments);
      console.log("partialView: %s", JSON.stringify(route));
      // var out = "$.jFormat(\"@views/" + route.controller + "/" +
      // route.action + "\"," + JSON.stringify(route.params)+")";
      var id = guid();
      if(this==route.model){
        var out = "$.jFormat(\"@views/" + route.controller + "/" + route.action + "\", @@model)";
      }else{
        this[id] = route.model;
        var out = "$.jFormat(\"@views/" + route.controller + "/" + route.action + "\", @model."+id+")";
      }
      var partial = new PartialView(route);
      var out = partial.preload(out);
      console.log("partialView | out: %s", out);
      return out;
    }
  }

  // =========================== Partial View Class ==================================
  var partialList = {};

  function PartialView(route){
    if(!route || !route.action || !route.controller){
      throw "route is required for PartialView";
    }
    this.route = route;
    this.id = route.id || guid();
    partialList[this.id] = this;
    this.refreshTime = route.refreshTime || 0;
    this.interval = null;
    this.wrapper = createWrapper(this.id);
    this.isRendered = false;
  }

  PartialView.prototype = {
    cancelRefresh: function(){
      if(!this.interval) return;
      clearInterval(this.interval);
      this.interval = null;
      this.wrapper.removeClass("refresh_on");
      this.wrapper.addClass("refresh_off");
    },
    stopRefresh: this.cancelRefresh,
    refresh: function(model){
      this.setLoading();
      viewRender(this.route,model,function(content){
        console.log("renderPartialPostHandler | callback id: %s", this.id);
        this.setLoaded(content);
      }.bind(this));
    },
    autoRefresh: function(){
      if(this.interval || !this.refreshTime) return;
      this.interval = setInterval(function(){
        console.log("PartialView.autoRefresh | id: %s", this.id);
        renderPartialPostHandler(this.id);
        this.wrapper.removeClass("refresh_off");
        this.wrapper.addClass("refresh_on");
      }.bind(this),this.refreshTime);
    },
    getWrapper: function(){
      return this.wrapper.get(0).outerHTML;
    },
    setLoading: function(){
      console.log("PartialView.setLoading");
      // update wrapper to point to the rendered dom element.
      this.wrapper = $("#"+this.id);
      this.wrapper.addClass("loading");
      this.wrapper.removeClass("loaded");
      this.wrapper.html("loading");

    },
    setLoaded: function(html){
      // console.log("PartialView.setLoaded: htlm: %s", html);
      // this.wrapper = $("#"+this.id);
      this.wrapper.addClass("loaded");
      this.wrapper.removeClass("loading");
      this.wrapper.html(html);
      this.isRendered = true;
    },
    preload: function(html){
      this.wrapper.addClass("loaded");
      this.isRendered = true;
      this.wrapper.html(html);
      return this.getWrapper();
    }
  }

  function createWrapper(id){
    console.log("createWrapper | id: %s", id);
    wrapper = $("<div>");
    wrapper.attr("id",id);
    wrapper.addClass("partial_view");
    wrapper.addClass("refresh_off");
    return wrapper;
  }
  /**
   * loop through the list of partialList and call loading
   */
  function loadingPartial(id){
    if(id){
      console.log("loadingPartial with id: %s", id);
      renderPartialPostHandler(id);
    }
    else{
      console.log("loading all partial");
      for(var i in partialList){
        if(!partialList[i].isRendered) renderPartialPostHandler(i);
      }
    }
  }

  function parseRenderPartialArgs(args){
    var route = {
      id: "",
      action: 'index',
      controller: currentControllerName,
      params: {},
      refreshTime: 0
    }


    if(typeof(args[0])=="object"){
      for(var i in route){
        if(args[0][i]) route[i] = args[0][i];
      }
    }
    else{
      if(args.length>0){
        route.action = args[0];
        if(typeof(args[1]) == "string"){
          route.controller = args[1];
          route.params = args[2] || {};
          route.refreshTime = args[3] || 0;
        }else{
          route.params = args[1] || {};
          route.refreshTime = args[2] || 0;
        }
      }

    }
    return route;
  }
  function parsePartialViewArgs(args){
    console.log("parsePartialViewArgs");
    var route = {
      id: "",
      action: 'index',
      controller: currentControllerName,
      model: {}
    }

    if(typeof(args[0])=="object"){
      for(var i in route){
        if(args[0][i]) route[i] = args[0][i];
      }
    }
    else{
      if(args.length>0){
        route.action = args[0];
        if(typeof(args[1]) == "string"){
          route.controller = args[1];
          route.model = args[2] || {};
          route.id = args[3] || "";
        }else{
          route.model = args[1] || {};
          route.id = args[2] || "";
        }
      }
    }
    return route;
  }
  // ========================private functions ============================

  /**
   * this function called after main body loaded, or when partialView
   * reloaded;
   *
   * @param id
   */
  function renderPartialPostHandler(id){
    console.log("renderPartialPostHandler | id: %s",id);
    var partial = partialList[id];
    partial.setLoading();
    viewRender(partial.route,null,function(content){
      // console.log("renderPartialPostHandler callback: %s", content);
      console.log("renderPartialPostHandler | callback id: %s", id);
      partial.setLoaded(content);
      if(partial.refreshTime) {
        console.log("call autoRefresh for Id: %s", id);
        partial.autoRefresh();
      }
    });
  }


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

    // adding handler for partial view
    var id= jObj.attr("id");
    console.log("postRender, id: %s", id);
    if(id == defaultOptions.container){
      loadingPartial();
    }
    else if(id in partialList){
      loadingPartial(id);
    }

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

  // this will set the params equal getParams
  // it should only be use to create link for anchor or form.
  function getRouteHelper(obj){
    var tmpRoute;
    if(typeof(obj)=="string"){
      tmpRoute = {action: obj, controller: currentControllerName};
    }
    else{
      tmpRoute = obj;
    }
    tmpRoute.getParams = $.extend({},tmpRoute.params);
    return $.extend({}, defaultRoute, tmpRoute);
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
    currentControllerName = controllerName;
    if(controllers[controllerName]!=undefined) {
      // console.log("controller already loaded");
      callback();
      return;
    }

    controllers[controllerName] = null;
    var filePath = defaultRoute.baseUrl + "/controllers/" + controllerName + ".js";
    var script = document.createElement("script");
    script.type="text/javascript";
    script.src = filePath;
    script.onload = function(){
      registerController(controllerName);
      callback();
    }
    document.head.appendChild(script);
// var script = $('<script type="text/javascript" src="'+ filePath
// +'"></script>');
// script.get(0).load = callback;
// $(document.body).append(script);
  }
  /**
   * when controller script loaded, $.jf.ctrl will be set some value;
   * this function will read the value, set to the controllers,
   * then reset the temporary $.jf.ctrl;
   * @returns
   */
  function registerController(name){
    controllers[name] = $.jf.ctrl.actions;
    $.jf.ctrl = {
        filters: [],
        actionFilters: {},
        actions:{}
    }
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

  /**
   * helper function to format string
   */
  function format() {
    var format = arguments[0] || "";
    var match = format.match(/%s|%d|%j/g);
    if (!match) return format;

    if (match.length != arguments.length - 1) throw { name: "Argument Error", message: "Number of arguments mismatch" };
    for (var i = 1; i < arguments.length; i++) {
      var matchIndex = i - 1;
      var value = (match[matchIndex] == "%j") ? JSON.stringify(arguments[i]) : arguments[i];
      format = format.replace(match[matchIndex], value);
    }
    return format;
  }

  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16)
        .substring(1);
  }
  function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4()
        + '-' + s4() + '-' + s4() + s4() + s4();
  }
})(jQuery);
