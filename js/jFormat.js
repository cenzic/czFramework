/**
 * Copyright © Quoc Quach 2013-2015
 * Author: Quoc Quach
 * Email: quoc_cooc@yahoo.com
 * Released under the MIT license
 * Date: 03/06/2015
 */
(function($) {
  $.fn.jFormat = function(id, model, callback) {
    var tmp = window.model;
    window.model = model;
    var self = this;
    $.jFormat(id, model, function(formattedText) {
      self.html(formattedText);
      window.model = tmp;
      if (callback)
        callback.call(self, formattedText);
    });
  };

  /**
   * @return {String}
   */
  function replace(t){
    t = t.replace(/\\/,'\\\\');
    t = t.replace(/\r\n/g,'\n');
    t = t.replace(/@model((\.[\w.\(\)]+)*(\[".+?"\])*(\.[\w.\(\)]+)*)+/g,function(m0){return m0.replace(/"/g,"'");});
    t = t.replace(/"/g,'\\"');
    t = t.replace(/@{2}/g,"{##}");
    t = replaceHelper(t);
    t = replaceHandler(t, true);
    t = replaceProperties(t, "model");
    t = t.replace(/\{##\}/g,"@");
    t = t.replace(/\n/g,'"+\n"');
    t = '"' + t + '"';
    return t;
  }

  function replaceProperties(t, name){
    var regex = new RegExp("@("+name+"((\\.\\w+)*(\\[['\"]?.+?['\"]?\\])*(\\.\\w+)*)+)","g");
    t = t.replace(regex, function(m0,m1){
        console.log(arguments);
        return '" + helpers.htmlEscape(' + revert(m0.substr(1)) + ') + "';
      });
    return t;
  }

  function replaceHandler(t, isRecursive){
    var r = /@for\(|@foreach\(|@if\(/;
    var m = t.match(r);
    if(m){
      switch(m[0]){
      case "@for(":
        t = replaceForloop(t);
        break;
      case "@foreach(":
        t = replaceForeach(t);
          break;
      case "@if(":
        t = replaceIf(t);
        break;
      default:
        break;
      }
    }
    if(isRecursive && r.test(t)){
      return replaceHandler(t, isRecursive);
    }
    return t;
  }

  function replaceHelper(t){
    for(var i in helpers){
      var regex = new RegExp("@"+i+"(\\(.*?\\))","g");
      t = t.replace(regex,function(m0,m1){
        return "\" + helpers."+i + revert(m1) + " + \"";
      });
    }
    return t;
  }

  function replaceForeach(t){
    console.log("replaceForeach");
    var r = /@foreach\(var (.+) in ([^\)]*)\)\{\n/;
    var m = r.exec(t);
    if(!m) return t;
    var startIndex = t.indexOf(m[0]);
    var out = '" + (function(){' +
    'var tmp = "";' +
    'for(var i in ' + m[2] + '){' +
    'var ' + m[1] + ' = ' + m[2] + '[i];' +
    'tmp += "';
    t = t.replace(m[0], out);
    t = replaceProperties(t,m[1]);
    t = closeStatement(t, startIndex, true);
    return t;
  }

  function replaceForloop(t){
    console.log("replaceForloop");
    var r = /@(for\(.+\)\{)\n/;
    var m = r.exec(t);
    if(!m) return t;
    var startIndex = t.indexOf(m[0]);

    r = /@for\(var (.+) in ([^\)]*)\)\{\n/;
    var mKey = t.match(r);
    if(mKey){
      var key = mKey[1];
      var body = getBody(t,startIndex);
      var rBody = replaceProperties(body,key);
      t = t.replace(body,rBody);
    }
    var out = '" + (function(){' +
    'var tmp = "";' +  m[1] +
    'tmp += "';
    t = t.replace(m[0], out);

    t = closeStatement(t, startIndex, true);
    return t;
  }

  function getBody(t, startIndex){
    var end = t.indexOf('}',startIndex);
    var r = /@for\(.*\)\{|@foreach\(.*\)\{|@if\(.*\)\{|@else if\(.*\)\{|@else\{/g;
    var m;
    var last = startIndex;
    while(m = r.exec(t)){
      console.log(m[0]);
      var next = t.indexOf(m[0], last);
      if(next!=-1 && next < end){
        last = end+1;
        end = t.indexOf('}',last);
      }else{
        break;
      }
    }
    return t.substring(startIndex, end);
  }

  //t = t.replace(/\\/,'\\\\');
  //t = t.replace(/"/g,'\\"');
  function revert(t){
    console.log(revert);
    t = t.replace(/\\{2}/g,'\\');
    t = t.replace(/\\"/g,'"');
    return t;
  }

  function replaceIf(t){
    var r = /@(if\(.+\)\{)\n/g;
    var m;
    while(m = r.exec(t)){
      var startIndex = t.indexOf(m[0]);
      console.log("replaceIf | m: %s", m[0]);
      var out = '" + (function(){' +
      'var tmp = "";' +  revert(m[1]) +
      'tmp += "';
      t = t.replace(m[0], out);
      t = closeStatement(t, startIndex);
    }
    return t;
  }

  function replaceElseif(t){
    console.log("replaceElseif");
    var r = /@(else if\([^\)]+\)\{)\n/;
    var m = r.exec(t);
    var startIndex = t.indexOf(m[0]);
    t = t.replace(m[0], revert(m[1]) + " tmp += \"");
    t = closeStatement(t, startIndex);
    return t;
  }

  function replaceElse(t){
    console.log("replaceElse");
    var r = /@else\{\n/;
    var m = r.exec(t)
    var startIndex = t.indexOf(m[0]);
    t = t.replace(m[0],"else{ tmp += \"");
    t = closeStatement(t, startIndex, true);
    return t;
  }

  //    t = t.replace(/\}/g,'"; } return tmp;})() + "');
  function closeStatement(t, startIndex, closed){
    console.log("closeStatement: startIndex: %s, closed: %s", startIndex, closed);
    var closeIndex = t.indexOf("}\n",startIndex);

    var ifIndex = t.indexOf("@if(", startIndex);
    ifIndex = ifIndex!=-1 ? ifIndex : Number.MAX_VALUE;
    if(closeIndex > ifIndex){
      t = replaceIf(t);
      closeIndex = t.indexOf("}\n",startIndex);
    }

    var forIndex = t.indexOf("@for(", startIndex);
    forIndex = forIndex!=-1 ? forIndex : Number.MAX_VALUE;
    if(closeIndex > forIndex){
      t = replaceForloop(t);
      closeIndex = t.indexOf("}\n",startIndex);
    }

    var foreachIndex = t.indexOf("@foreach(", startIndex);
    foreachIndex = foreachIndex!=-1 ? foreachIndex : Number.MAX_VALUE;
    if(closeIndex > foreachIndex){
      t = replaceForeach(t);
      closeIndex = t.indexOf("}\n",startIndex);
    }

    if(closed){
      console.log("closed block");
      return t.replace("}\n",'"; } return tmp;})() + "');
    }

    var elseifIndex = t.indexOf("@else if", startIndex);
    if(elseifIndex!=-1){
      console.log("has else if block");
      var tmp = t.substring(closeIndex+1,elseifIndex);
      if(!tmp.match(/\S/g,'')){
        console.log("calling replace else if");
        t = t.replace("}\n","\";}");
        t = replaceElseif(t);
        return t;
      }
    }

    var elseIndex = t.indexOf("@else{\n", startIndex);
    if(elseIndex!=-1){
      console.log("has else block");
      var tmp = t.substring(closeIndex+1,elseIndex);
      console.log("tmp: %s", tmp);
      if(!tmp.match(/\S/g,'')){
        console.log("calling replace else");
        t = t.replace("}\n","\";}");
        t = replaceElse(t);
        return t;
      }
    }

    return t.replace("}\n",'"; } return tmp;})() + "');
  }

  function partial(id, model){
    console.log("partial | id: %s", id);
    console.log(model);
    var formatted;
    //this only work because getTemplate is in synchronous condition
    getTemplate(id, function(template){;
      console.log("partial | getTemplate come back");
      var t = replace(template);
      formatted = jEval(model, t);
    });
    console.log("partial | return");
    return formatted;
  }

  var helpers = {
      raw : function(s) {
        return s;
      },
      htmlEscape: htmlEscape,
      partial: partial
    };

  function jEval(model, func){
    func = "out = " + func + ";";
    console.log(func);
    var out;
    eval(func);
    return out;
  }

  /**
   * do a different approach. load all template ahead of time and then let the eval function to compute the template.
   * as long as template available it's eval synchronously.
   */
  function loadTemplate(id, model, callback){
    console.log("loadTemplate: %s", id);
    var m = id.match(/model(.+)/);
    if(m){
      id = getObjectProperty(model, m[1]);
      console.log("eval id: %s", id);
    }
    if(id.match(/^["'].+["']$/)){
      id = id.slice(1,-1);
    }
    getTemplate(id,function(template){
      console.log("loadTemplate | getTemplate come back id: %s", id);
      if (template.indexOf("@partial(") != -1) {
        var regex = /@partial\((.*),.*\)/g;
        var total = template.match(regex).length;
        var m;
        var count = 0;
        while(m = regex.exec(template)){
          loadTemplate(m[1], model, function(){
            count++;
            console.log("loadTemplate | partial template count: %d id: %s", count, id);
            if(count == total){
              if(callback) callback();
            }
          });
        }
      }
      else{
        console.log("loadTemplate | no partial, calling callback id: %s", id);
        if(callback) callback();
      }
    });

  }

  $.jFormat = function(id, model, callback){
    loadTemplate(id, model, function(){
      console.log("$.jFormat | load template complete, call partial");
      var formatted = partial(id, model);
      if(callback){
        console.log("$.jFormat | calling callback");
        callback.call(this,formatted);
      }else{
        console.log("$.jFormat | callback not defined");
      }
      return formatted;
    });
  }

  var jFormatCache = {};
  var jCache = function(callback) {
    this.isReady = false;
    this.data = "";
    this.callbacks = [ callback ];
  };

  var jFormatOptions = {
    baseUrl : "", // calculate match with the base url of the jFormat.js
    paths : {}, // hash to map a name to a path manually. If not it will be
                // resolved base on on name
    cacheUrls : []
  // array of url need to fetch for cache
  };

  $.jFormat.init = function(opts) {
    jFormatOptions = $.extend({}, jFormatOptions, opts);
    for ( var i in jFormatOptions.cacheUrls) {
      var url = jFormatOptions.cacheUrls[i];
      getTemplateAsync(url, null);
    }
  };


  $.jFormat.addHelper = function(h) {
    helpers = $.extend(helpers, h);
  }

  // ========================== Private functions ================================
  function getTemplate(id, callback) {
    if (id.charAt(0) == "#") {
      var jTemplate = $(id);
      if (jTemplate.length != 1) {
        throw new Error("template not found");
      }
      callback(jTemplate.html());
    } else if (id.charAt(0) == "@" || id.charAt(0) == "~") {
      var url = getFullUrl(id.substring(1));
      getTemplateAsync(url, callback);
    } else {
      //provide as a template string
      callback(id);
    }
  }

  function getFullUrl(path) {
    path = jFormatOptions.paths[path] || (path + ".html");
    return jFormatOptions.baseUrl + "/" + path;
  }

  function getTemplateAsync(url, callback) {
    if (jFormatCache[url] !== undefined) {
      var cache = jFormatCache[url];
      cache.callbacks.push(callback);
      if (cache.isReady) {
        handleCallback(url);
      }
      return;
    }
    jFormatCache[url] = new jCache(callback);
    $.ajax({
      url : url,
      async : true,
      success : function(data) {
        jFormatCache[url].isReady = true;
        jFormatCache[url].data = data;
        handleCallback(url);
      },
      error : function() {
        delete jFormatCache[url];
      }
    });
  }

  function handleCallback(url) {
    var cache = jFormatCache[url];
    if (cache == undefined)
      return;
    var callback;
    while (callback = cache.callbacks.shift()) {
      callback(cache.data, true);
    }
  }

  function htmlEscape(str) {
    return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  }

  function htmlUnescape(value) {
    return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  }

  function getObjectProperty(obj, propertyStr) {
    // normalize property signature
    if (!obj)
      return;
    if (propertyStr.charAt(0) != '[' && propertyStr.charAt(0) != '.')
      propertyStr = "." + propertyStr;
    var regex = /\.(\w+)|\[['"]([^'"]+)['"]\]|\[(\d+)\]/g;
    var m, current = obj;
    while (m = regex.exec(propertyStr)) {
      var key = m[1] || m[2] || m[3]
      current = current[key];
      if (!current)
        return;
    }
    return current;
  }
})(jQuery);