/**
 *
 */
(function($){
  //adding new helper functions to view rendering
  $.jFormat.addHelper({
    /**
     * Render partial will create an wrapper element to be render later.
     */
    renderPartial : function() {
      console.log("renderPartial called");
      var route = parseRenderPartialArgs(arguments);
      var partial = new PartialView(route);
      return partial.getWrapper();
    },

    /**
     * it's just a helper for jFormat partial render. the params is the
     * model for partialView
     */
    partialView : function() {
      var route = parsePartialViewArgs(arguments);
      console.log("partialView: %s", JSON.stringify(route));
      // var out = "$.jFormat(\"@views/" + route.controller + "/" +
      // route.action + "\"," + JSON.stringify(route.params)+")";
      var id = $.util.guid();
      if (this == route.model) {
        var out = "$.jFormat(\"@views/" + route.controller + "/" + route.action
            + "\", @@model)";
      } else {
        this[id] = route.model;
        var out = "$.jFormat(\"@views/" + route.controller + "/" + route.action
            + "\", @model." + id + ")";
      }
      var partial = new PartialView(route);
      var out = partial.preload(out);
      console.log("partialView | out: %s", out);
      return out;
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
        console.log("postRender, id: %s", id);
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
//=============================== private function ==========================================
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


  function parsePartialViewArgs(args){
    console.log("parsePartialViewArgs");
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
    console.log("renderPartialPostHandler | id: %s",id);
    var partial = partialList[id];
    partial.setLoading();
    $.jf.viewRender(partial.route,null,function(content){
      // console.log("renderPartialPostHandler callback: %s", content);
      console.log("renderPartialPostHandler | callback id: %s", id);
      partial.setLoaded(content);
      if(partial.refreshTime) {
        console.log("call autoRefresh for Id: %s", id);
        partial.autoRefresh();
      }
    });
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
})(jQuery)