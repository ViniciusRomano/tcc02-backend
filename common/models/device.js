"use strict";

module.exports = function (Device) {
  Device.observe("before save", async function (ctx) {
    console.log(ctx)
  });

  Device.observe("after save", async function (ctx) {
    console.log(ctx)
  });

};
