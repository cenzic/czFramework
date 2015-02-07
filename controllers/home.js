(function(ctrl){
  ctrl.actions = {
      /**
       * return null or empty will have model is empty object. It will render the default template
       * base on naming convention.
       */
      index: function(){
        console.log("home.index");
        return;
      },

      /**
       * This is the special function to handle any undefined action.
       */
      _default: function(){
        console.log("default action");
      },
      /**
       * this is another special action which will be called before each action.
       * it will not modify pre and post data of the action.
       */
      _init: function(){
        console.log("_init controller");
      },
      /**
       * return a model used in default template
       */
      simpleModel: function(name, age){
        console.log("home.simpleModel");
        name = name || "Quoc";
        age = age || "18";
        age = parseInt(age);
        return {name: name.toUpperCase(), age: (age + 10)}
      },

      /**
       * renderTemplate is the wrapper function of jFormat to render a view directly.
       */
      renderTemplate: function(obj){
        console.log("home.renderTemplate");
        return $.jf.renderTemplate("simpleModel", {name: "render template",age: 30});
      },

      /**
       * return a model used in default template
       * asynchronous is not a problem, but it freeze the browser and should not be used.
       * best would be able to handle asynchronous.
       */
      remoteSimpleModel: function(name, age){
        console.log("home.remoteSimpleModel");
        return ctrl.get("demo_models/simpleObject.txt",function(d){
          console.log("callback is ready: %s", JSON.stringify(d));
          return $.jf.renderTemplate("simpleModel", d);
        },"json");
      },

      /**
       * plain text will be use instead of a template.
       */
      plainText: function(checkme){
        console.log("typeof checkme: %s", typeof(checkme));
        checkme = ($.isArray(checkme)) ? checkme : [checkme];
        return "some text to be displace " + checkme.join(" ");
      },

      /**
       * jf will provide a collection of predefine template to use.
       * This can be apply to predefined layout, grid, chart...
       * user can add more helper templates to share across the site.
       * to register the helper template, it need 2 parts. callback function, and view templates.
       * it could be done in the index file.
       */
      helperTemplate: function(){
        return $.jf.get("demo_models/simpleObject.txt", function(d){
          console.log("callback is ready: %s", JSON.stringify(d));
          var gridObj = [
              {action: "sample_template",
               model: d,
               position: [1,1]
              },
              {action: "sample_template",
                model: d,
                position: [1,2]
              },
              {action: "sample_template",
                model: d,
                position: [2,1]
              },
              {action: "sample_template",
               model: d,
               position: [2,2]
              }
          ]
          return $.jf.helperTemplate("grid_layout",[d,d]);
        },"json");
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
        console.log("renderPartial | name: %s , age: %d", name, age);
        name = name || Math.random().toString(36);
        age = age || Math.floor(Math.random()*100);
        return {name: name, age: age};
      }
  }
})($.jf);