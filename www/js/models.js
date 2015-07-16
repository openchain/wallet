var module = angular.module("OpenChainWallet.Models", []);
var bitcore = require("bitcore");

module.value("walletSettings", {
    hdKey: null,
    derivedKey: null,
    rootAccount: null,
    initialized: false,
    versionPrefix: "v1",
    sign: function (value) {
        var transactionBuffer = new Uint8Array(value.toArrayBuffer());
        var hash = bitcore.crypto.Hash.sha256(bitcore.crypto.Hash.sha256(transactionBuffer));

        return bitcore.crypto.ECDSA().set({
            hashbuf: hash,
            endian: "big",
            privkey: this.derivedKey.privateKey
        }).sign().sig.toBuffer();
    }
});

module.factory("Endpoint", function ($q, apiService, encodingService) {

    var Endpoint = function (properties) {
        var _this = this;

        this.properties = properties;
        this.rootUrl = properties.rootUrl;
        this.assets = {};

        this.downloadAssetDefinition = function (assetPath) {
            return apiService.getValue(_this, encodingService.encodeString(assetPath, 1 + 256)).then(function (result) {
                if (result.value == null) {
                    return null;
                }
                else {
                    return JSON.parse(encodingService.decodeString(result.value));
                }
            })
        };

        this.getAssetDefinition = function (assetPath) {
            if (assetPath in _this.assets) {
                return $q.resolve(_this.assets[assetPath]);
            }
            else {
                return _this.downloadAssetDefinition(assetPath).then(function (result) {

                    if (result != null) {
                        assetInfo = {
                            name: result.name,
                            nameShort: result.name_short,
                            iconUrl: result.icon_url,
                            path: assetPath,
                            fullPath: _this.rootUrl + "asset" + assetPath
                        };

                        _this.assets[assetPath] = assetInfo;

                        return assetInfo;
                    }
                    else {
                        return null;
                    }
                    
                })
            };
        };
    }

    return Endpoint;
});

module.service("endpointManager", function (apiService, walletSettings, Endpoint) {
    var nextEndpointId = 0;
    var storedEndpoints = localStorage[walletSettings.versionPrefix + ".endpoints"];

    if (storedEndpoints)
        var initialEndpoints = JSON.parse(storedEndpoints);
    else
        var initialEndpoints = {};

    this.endpoints = { };

    for (var key in initialEndpoints) {
        if (key >= nextEndpointId)
            nextEndpointId = key + 1;

        this.endpoints[key] = new Endpoint(initialEndpoints[key]);
    }

    this.addEndpoint = function(endpoint) {
        var newEndpoint = {
            id: nextEndpointId++,
            rootUrl: endpoint.root_url,
            name: endpoint.name
        };

        this.endpoints[newEndpoint.id] = new Endpoint(newEndpoint);
        this.saveEndpoints();
        
    };

    this.saveEndpoints = function () {
        var jsonData = {};
        for (var key in this.endpoints)
            jsonData[key] = this.endpoints[key].properties;
        
        localStorage[walletSettings.versionPrefix + ".endpoints"] = JSON.stringify(jsonData);
    }
});