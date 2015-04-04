/**
 *
 */
(function($){
  var log = $.log.init("helpers","warn");
  //registering new helper function for view rendering
  $.jFormat.addHelper({
    /**
     * first argument can be either string as action name or object
     * {action:actionName: controller: controllerName, params:{key value
     * pairs}} second argument is the text of the link;
     */
    link : function(routeInfo, text) {
      log.debug("viewHelpers.link called");
      if (arguments.length != 2)
        throw "Arguments Exception" + JSON.stringify(arguments);
      var route = getRouteHelper(routeInfo);
      return "<a href='" + $.jf.getHashPath(route) + "'>" + text + "</a>";
    },
    hashPath : function(routeInfo) {
      log.debug("viewHelpers.hashPath called: %s", routeInfo);
      var route = getRouteHelper(routeInfo);
      log.debug("route: %s", JSON.stringify(route));
      return $.jf.getHashPath(route);
    }
  });

//=============================== private function ==========================================

  //this will set the params equal getParams
  // it should only be use to create link for anchor or form.
  function getRouteHelper(obj){
    var tmpRoute;
    if(typeof(obj)=="string"){
      tmpRoute = {action: obj, controller: $.jf.currentControllerName};
    }
    else{
      tmpRoute = obj;
    }
    tmpRoute.getParams = $.extend({},tmpRoute.params);
    return $.extend({}, $.jf.defaultRoute, tmpRoute);
  }
})(jQuery)