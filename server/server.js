"use strict";

var loopback = require("loopback");
var boot = require("loopback-boot");
var explorer = require("loopback-component-explorer");

var app = (module.exports = loopback());

// Passport configurators..
var loopbackPassport = require("loopback-component-passport");
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

app.start = function () {
  // start the web server
  return app.listen(function () {
    app.emit("started");
    var baseUrl = app.get("url").replace(/\/$/, "");
    console.log("Web server listening at: %s", baseUrl);
  });
};


app.use(loopback.token());
// app.use('/api/explorer', explorer.routes(app, { basePath: '/api' }));

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.

boot(app, __dirname, function (err) {
  if (err) throw err;
  if (require.main === module) {
    app.io = require("socket.io")(app.start(), { cors: { origin: "*" } });
    app.io.on("connection", function (socket) {
      socket.on("disconnect", function () {
        console.log("user disconnected");
      });
    });
  }
});