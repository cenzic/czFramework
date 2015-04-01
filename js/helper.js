/**
 *
 */

$.jFormat.addHelper({
  //render each header cell
  tHeadRender: function(tHead){
    console.log("tHead: %s",JSON.stringify(tHead));
    return JSON.stringify(tHead);
  },
  tRowRender: function(tRow){
    console.log("tRow: %s",JSON.stringify(tRow));
    return JSON.stringify(tRow);
  },
  //render each  footer features
  tFooterRender: function(tFooter){
    console.log("tFooter: %s",JSON.stringify(tFooter));
    return JSON.stringify(tFooter);
  }
})