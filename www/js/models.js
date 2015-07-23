var module = angular.module("OpenChainWallet.Models", []);
var bitcore = require("bitcore");

module.value("walletSettings", {
    hdKey: null,
    derivedKey: null,
    rootAccount: null,
    initialized: false,
    versionPrefix: "v1",
    setRootKey: function (key) {
        this.hdKey = key;

        this.derivedKey = key.derive(44, true).derive(22, true).derive(0, true).derive(0).derive(0);
        this.rootAccount = "/p2pkh/" + this.derivedKey.privateKey.toAddress().toString();
        this.initialized = true;
    },
    getAssetKey: function (index) {
        return this.hdKey.derive(44, true).derive(22, true).derive(1, true).derive(0).derive(index);
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
                if (result.value.remaining() == 0) {
                    return { value: null, version: result.version };
                }
                else {
                    return { value: JSON.parse(encodingService.decodeString(result.value)), version: result.version };
                }
            })
        };

        this.getAssetDefinition = function (assetPath) {
            if (assetPath in _this.assets) {
                return $q.resolve(_this.assets[assetPath]);
            }
            else {
                return _this.downloadAssetDefinition(assetPath).then(function (result) {

                    if (result.value != null) {
                        assetInfo = {
                            name: result.value.name,
                            nameShort: result.value.name_short,
                            iconUrl: result.value.icon_url,
                            path: assetPath,
                            version: result.version
                        };
                    }
                    else {
                        assetInfo = {
                            version: result.version
                        };
                    }
                    
                    _this.assets[assetPath] = assetInfo;

                    return assetInfo;
                })
            };
        };
    }

    return Endpoint;
});

module.factory("AssetData", function ($q, apiService, encodingService) {

    var AssetData = function (endpoint, assetPath) {
        var _this = this;

        this.asset = assetPath;
        this.endpoint = endpoint;
        this.fullPath = endpoint.rootUrl + "asset" + assetPath;

        this.setAccountBalance = function (balanceData) {
            _this.account = balanceData.account;
            _this.balance = Long.fromString(balanceData.balance);
            _this.version = ByteBuffer.fromHex(balanceData.version);
        };

        this.fetchAssetDefinition = function () {
            return this.endpoint.getAssetDefinition(this.asset).then(function(result) {
                _this.assetDefinition = result;
            });
        };
    }

    return AssetData;
});
