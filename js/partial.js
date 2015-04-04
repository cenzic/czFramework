/**
 *
 */
(function($){
  var log = $.log.init("partial","warn");
  //adding new helper functions to view rendering
  $.jFormat.addHelper({
    /**
     * Render partial will create an wrapper element to be render later.
     */
    renderPartial : function() {
      var route = parseRenderPartialArgs(arguments);
      log.debug("renderPartial: route %j", route);
      var partial = new PartialView(route);
      return partial.getWrapper();
    },

    /**
     * it's just a helper for jFormat partial render. the params is the
     * model for partialView
     */
    partialView : function() {
      var route = parsePartialViewArgs(arguments);
      log.debug("partialView | route: %j", route);
      var partial = new PartialView(route);
      return partial.getWrapper();
    }
  });

  $.partial = {
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
      postRender: function(id){
        if(!id) return;
        log.debug("postRender, id: %s", id);
        if(id == $.jf.defaultOptions.container){
          loadingPartial();
        }
        else if(id in partialList){
          loadingPartial(id);
        }
      }
  }

  // =========================== Partial View Class ==================================
  var partialList = {};

  function PartialView(route){
    if(!route || !route.action || !route.controller){
      throw "route is required for PartialView";
    }
    this.route = route;
    this.id = route.id || $.util.guid();
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
      if(!this.isActive()) return;
      this.setLoading();
      $.jf.viewRender(this.route,model,function(content){
        log.debug("renderPartialPostHandler | callback id: %s", this.id);
        this.setLoaded(content);
      }.bind(this));
    },
    autoRefresh: function(){
      log.debug("autoRefresh");
      if(this.interval || !this.refreshTime) return;
      this.interval = setInterval(function(){
        log.debug("PartialView.autoRefresh | id: %s", this.id);
        //check if element still in the dom, if not remove the partial
        if(!this.isActive()) return;
        renderPartialPostHandler(this.id);
        this.wrapper.removeClass("refresh_off");
        this.wrapper.addClass("refresh_on");
      }.bind(this),this.refreshTime);
    },
    isActive: function(){
      this.wrapper = $("#"+this.id);
      if(!$.util.isInDom(this.wrapper.get(0))){
        log.info("partial no longer in dom, clean it up");
        if(this.interval) clearInterval(this.interval);
        delete partialList[this.id];
        return false;
      }
      return true;
    },
    getWrapper: function(){
      return this.wrapper.get(0).outerHTML;
    },
    setLoading: function(){
      log.debug("PartialView.setLoading");
      // update wrapper to point to the rendered dom element.
      this.wrapper = $("#"+this.id);
      this.wrapper.addClass("loading");
      this.wrapper.removeClass("loaded");
      this.wrapper.html("loading");

    },
    setLoaded: function(html){
      // log.debug("PartialView.setLoaded: htlm: %s", html);
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
//=============================== private function ==========================================
  function createWrapper(id){
    log.debug("createWrapper | id: %s", id);
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
      log.debug("loadingPartial with id: %s", id);
      renderPartialPostHandler(id);
    }
    else{
      log.debug("loading all partial");
      for(var i in partialList){
        if(!partialList[i].isRendered) renderPartialPostHandler(i);
      }
    }
  }

  function parseRenderPartialArgs(args){
    var route = {
      id: "",
      action: 'index',
      controller: $.jf.currentControllerName,
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
    log.debug("parsePartialViewArgs");
    var route = {
      id: "",
      action: 'index',
      controller: $.jf.currentControllerName,
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
  /**
   * this function called after main body loaded, or when partialView
   * reloaded;
   *
   * @param id
   */
  function renderPartialPostHandler(id){
    log.debug("renderPartialPostHandler | id: %s",id);
    var partial = partialList[id];
    partial.setLoading();
    $.jf.viewRender(partial.route,partial.route.model,function(content){
      // log.debug("renderPartialPostHandler callback: %s", content);
      log.debug("renderPartialPostHandler | callback id: %s", id);
      partial.setLoaded(content);
      if(partial.refreshTime) {
        log.debug("call autoRefresh for Id: %s", id);
        partial.autoRefresh();
      }
    });
  }


})(jQuery)