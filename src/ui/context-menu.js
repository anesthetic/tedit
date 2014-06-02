define("ui/context-menu.js", ["dombuilder.js"], function (module, exports) { "use strict";

var domBuilder = require('dombuilder.js');

module.exports = ContextMenu;

function ContextMenu(evt, node, items) {
  if (!(this instanceof ContextMenu)) return new ContextMenu(evt, node, items);
  var $ = {};

  var css = { left: evt.pageX + "px" };
  if (evt.pageY < window.innerHeight / 2) {
    css.top = evt.pageY + "px";
  }
  else {
    css.bottom = (window.innerHeight - evt.pageY) + "px";
  }
  var attrs = { css: css };
  document.body.appendChild(domBuilder([
    [".shield$shield", {onclick: closeMenu, oncontextmenu: closeMenu}],
    ["ul.contextMenu$ul", attrs, items.map(function (item) {
      if (item.sep) return ["li.sep", ["hr"]];
      var attrs = {};
      if (item.action) {
        attrs.onclick = function (evt) {
          closeMenu(evt);
          item.action(node);
        };
      }
      else {
        attrs.class = "disabled";
      }
      return ["li", attrs,
        ["i", {class: "icon-" + item.icon}],
        item.label
      ];
    })],
  ], $));

  this.close = closeMenu;
  function closeMenu(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    document.body.removeChild($.ul);
    document.body.removeChild($.shield);
    $ = null;
  }
}

});
