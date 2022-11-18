"use strict";

module.exports = function (Notification) {
  Notification.observe("before save", async function (ctx) {
    console.log(ctx);
  });

  Notification.observe("after save", async function (ctx) {
    console.log(ctx);
  });
  
};
