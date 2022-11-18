var path = require('path');
var app = require(path.resolve(__dirname, '../server/server'));
var arrModels = require(path.resolve(__dirname, '../server/model-config.json'));
var ds = app.datasources.postgres;
require('events').EventEmitter.prototype._maxListeners = 100;

var promises = new Array();
ds.getMaxOfflineRequests = () => 10000;
Object.keys(arrModels).forEach(model => {

    if (arrModels[model].dataSource!="postgres"){
        return;
    }

    if (process.argv[2] && process.argv[2]!=model){
        return;
    }

    var pms = ds.autoupdate(model);

    pms.then(function(){
        console.log("Updated: "+model);
    }).catch(function err(e) {
        console.log('Error:', e);
    });

    promises.push(pms);
});
