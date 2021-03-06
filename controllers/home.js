(function(ctrl){
  var log = $.log.init("home");
  ctrl.actions = {
      /**
       * return null or empty will have model is empty object. It will render the default template
       * base on naming convention.
       */
      index: function(){
        log.debug("home.index");
        return;
      },

      /**
       * This is the special function to handle any undefined action.
       */
      _default: function(){
        log.debug("default action");
      },
      /**
       * this is another special action which will be called before each action.
       * it will not modify pre and post data of the action.
       */
      _init: function(){
        log.debug("_init controller");
      },
      /**
       * return a model used in default template
       */
      simpleModel: function(name, age){
        log.debug("home.simpleModel");
        name = name || "Quoc";
        age = age || "18";
        age = parseInt(age);
        return {name: name.toUpperCase(), age: (age + 10)}
      },

      /**
       * renderTemplate is the wrapper function of jFormat to render a view directly.
       */
      renderTemplate: function(obj){
        log.debug("home.renderTemplate");
        return $.jf.renderTemplate("simpleModel", {name: "render template",age: 30});
      },

      /**
       * return a model used in default template
       * asynchronous is not a problem, but it freeze the browser and should not be used.
       * best would be able to handle asynchronous.
       */
      remoteSimpleModel: function(name, age){
        log.debug("home.remoteSimpleModel");
        return ctrl.get("demo_models/simpleObject.txt",function(d){
          log.debug("callback is ready: %s", JSON.stringify(d));
          return $.jf.renderTemplate("simpleModel", d);
        },"json");
      },

      /**
       * plain text will be use instead of a template.
       */
      plainText: function(checkme){
        log.debug("typeof checkme: %s", typeof(checkme));
        checkme = ($.isArray(checkme)) ? checkme : [checkme];
        return "some text to be displace " + checkme.join(" ");
      },

      partialDemo: function(){
        return {
          name: "partial Demo name",
          age: 21,
          dob: new Date("1990/01/01"),
          info: "some information"
        }
      },
      renderPartial: function(name, age){
        log.debug("renderPartial | name: %s , age: %d", name, age);
        name = name || Math.random().toString(36);
        age = age || Math.floor(Math.random()*100);
        return {name: name, age: age};
      },
      simpleGrid: function(){
        log.debug("simpleGrid");
        var tableInfo = {
            headers: [
              {name:"first", description: "first column"},
              {name:"second", description: "second column"}
            ],
            rows: [
              ["a","b"],
              ["c","d"]
            ],
            footers: []
        }
        return ctrl.helperTemplate("simple_grid",tableInfo);
      }
  }
})($.jf);