jUtil = {
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
    }
}

jLog = {
    debug: function(){
      console.log(util.format.apply(this,arguments));
    },
    info: function(){
      console.info(util.format.apply(this,arguments));
    },
    warn: function(){
      console.warn(util.format.apply(this,arguments));
    },
    error: function(){
      console.error(util.format.apply(this,arguments));
    }
}