// Copyright 2015 Coinprism, Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var module = angular.module("OpenchainWallet.Services", []);

module.service("endpointManager", function ($q, walletSettings, Endpoint) {
    var storedEndpoints = localStorage[walletSettings.versionPrefix + ".endpoints"];
    var _this = this;

    if (storedEndpoints)
        var initialEndpoints = JSON.parse(storedEndpoints);
    else
        var initialEndpoints = [];

    this.endpoints = {};

    for (var i = 0; i < initialEndpoints.length; i++) {
        this.endpoints[initialEndpoints[i]] = new Endpoint(initialEndpoints[i]);
    }

    this.loadEndpoints = function () {
        return $q.all(initialEndpoints.map(function (url) {
            return _this.endpoints[url].loadEndpointInfo();
        }));
    }

    this.addEndpoint = function (endpoint) {
        this.endpoints[endpoint.rootUrl] = endpoint;
        this.saveEndpoints();
    };

    this.saveEndpoints = function () {
        var jsonData = [];
        for (var key in this.endpoints)
            jsonData.push(this.endpoints[key].rootUrl);

        localStorage[walletSettings.versionPrefix + ".endpoints"] = JSON.stringify(jsonData);
    }
});

module.service("validator", function () {
    var _this = this;

    this.isNumber = function (number) {
        var regex = /^[\-]?\d+(\.\d+)?$/;
        return regex.test(number);
    }
});

module.service("controllerService", function ($location, walletSettings, endpointManager) {
    this.checkState = function() {
        if (Object.keys(endpointManager.endpoints).length === 0) {
            if ($location.path() != "/addendpoint") {
                $location.path("/addendpoint");
                return false;
            }
        }
        else if (!walletSettings.initialized) {
            if ($location.path() != "/signin") {
                $location.path("/signin");
                return false;
            }
        }
        
        return true;
    };
});