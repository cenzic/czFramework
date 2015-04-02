(function($){
  //adding util function to jquery
  $.util = {
      timer: function(callback){
        var start = new Date();
        callback();
        var end = new Date();
        var runTime = end-start;
        console.log("run time: %d", runTime);
        return runTime;
      },

      time: function(count, callback){
        return function(){
          for(var i=0;i<count;i++){
            callback();
          }
        }
      },
      /**
       * helper function to format string
       */
      format: function() {
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
      },

      guid: function() {
        return s4() + s4() + '-' + s4() + '-' + s4()
            + '-' + s4() + '-' + s4() + s4() + s4();
      },
      toArray: function(args){
        return Array.prototype.slice.apply(args);
      }
  };
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  //Adding log feature to jquery
  var LogLevel = {
      "debug":4,
      "info":3,
      "warn":2,
      "error":1
  };
  var Log = function(prefix, level){
    this.prefix = prefix || "";
    level = level || "debug";
    this.level = LogLevel[level];
  };
  Log.prototype = {
      debug:function(){
        if(this.level < 4) return;
        console.log(formatMessage(arguments, this.prefix, "debug"));
      },
      info: function(){
        if(this.level < 3) return;
        console.info(formatMessage(arguments, this.prefix, "info "));
      },
      warn: function(){
        if(this.level < 2) return;
        console.warn(formatMessage(arguments, this.prefix, "warn "));
      },
      error: function(){
        if(this.level < 1) return;
        console.error(formatMessage(arguments, this.prefix, "error"));
      }
  };
  var log = new Log();
  log.init = function(prefix, level){
    return new Log(prefix, level);
  };
  $.log = log;
  //==============================================
  /**
   * timestamp | level | prefix | message
   * @param args
   * @param prefix
   * @param type
   */
  function formatMessage(args, prefix, level){
    args = $.util.toArray(args);
    var now = new Date().getTime();
    if(prefix){
      args.splice(1,0,now,level,prefix);
      args[0] = '%s | %s | %s | ' + args[0];
    }
    else{
      args.splice(1,0,now,level);
      args[0] = '%s | %s | ' + args[0];
    }
    return $.util.format.apply(console,args);
  }
})(jQuery);
