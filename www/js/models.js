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

var module = angular.module("OpenchainWallet.Models", []);
var bitcore = require("bitcore-lib");
var sdk = require("openchain");
var ByteBuffer = sdk.ByteBuffer;
var LedgerPath = sdk.LedgerPath;
var RecordKey = sdk.RecordKey;

module.value("walletSettings", {
    hdKey: null,
    derivedKey: null,
    rootAccount: null,
    initialized: false,
    versionPrefix: "v2",
    network: null,
    setRootKey: function (key) {
        this.hdKey = key;
        this.network = key.network;
        this.derivedKey = key.derive(44, true).derive(64, true).derive(0, true).derive(0).derive(0);
        this.rootAccount = "/p2pkh/" + this.derivedKey.privateKey.toAddress().toString() + "/";
        this.initialized = true;
    },
    getAssetKey: function (index) {
        return this.hdKey.derive(44, true).derive(64, true).derive(1, true).derive(0).derive(index);
    }
});

module.factory("ApiClient", function ($http) {
    var ApiClient = function (url) {
        var _this = this;

        sdk.ApiClient.call(this, url);

        this.httpGet = function (url) {
            return $http({
                url: url,
                method: "GET"
            }).then(function (result) {
                return result.data;
            });
        };

        this.httpPost = function (url, data) {
            return $http.post(url, data)
            .then(function (result) {
                return result.data;
            });
        };
    };

    ApiClient.prototype = new sdk.ApiClient("");

    return ApiClient;
});

module.factory("Endpoint", function ($q, ApiClient) {

    var Endpoint = function (url) {
        var _this = this;

        this.properties = {};
        this.rootUrl = url;
        this.assets = {};
        this.namespace = null;
        this.apiService = new ApiClient(this.rootUrl);

        this.loadEndpointInfo = function () {
            var infoRecord = _this.apiService.getDataRecord("/", "info").then(function (result) {
                if (result.data == null) {
                    _this.properties = {};
                }
                else {
                    var properties = JSON.parse(result.data);
                    _this.properties = {
                        name: properties.name,
                        validatorUrl: properties.validator_url,
                        tos: properties.tos,
                        webpageUrl: properties.webpage_url
                    };
                }

                return _this;
            }, function (err) {
                _this.properties = {};
            });

            var chainInfo = _this.apiService.initialize().then(function () { }, function () {
                _this.apiService.namespace = sdk.encoding.encodeString(_this.rootUrl);
            })

            return $q.all([infoRecord, chainInfo]).then(function (result) {
                return result[0];
            });
        };

        this.downloadAssetDefinition = function (assetPath) {
            return _this.apiService.getDataRecord(assetPath, "asdef").then(function (result) {
                if (result.value.remaining() == 0) {
                    return { key: result.key, value: null, version: result.version };
                }
                else {
                    return { key: result.key, value: JSON.parse(sdk.encoding.decodeString(result.value)), version: result.version };
                }
            })
        };

        this.getAssetDefinition = function (assetPath, noCache) {
            if (!noCache && assetPath in _this.assets) {
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
                            key: result.key,
                            version: result.version
                        };
                    }
                    else {
                        assetInfo = {
                            version: result.version
                        };
                    }

                    _this.assets[assetPath] = assetInfo;

                    return $q.resolve(assetInfo);
                })
            };
        };
    }

    return Endpoint;
});

module.factory("AssetData", function ($q) {

    var AssetData = function (endpoint, assetPath) {
        var _this = this;

        this.asset = assetPath;
        this.endpoint = endpoint;
        this.assetPath = LedgerPath.parse(assetPath);

        if (endpoint.rootUrl.slice(endpoint.rootUrl.length - 1, endpoint.rootUrl.length) == "/") {
            this.fullPath = endpoint.rootUrl + assetPath.slice(1, assetPath.length);
        }
        else {
            this.fullPath = endpoint.rootUrl + assetPath;
        }

        this.setAccountBalance = function (balanceData) {
            _this.currentRecord = balanceData;
            _this.currentRecord.version = ByteBuffer.fromHex(balanceData.version);
            _this.currentRecord.key = new RecordKey(balanceData.account, "ACC", balanceData.asset).toByteBuffer();
            _this.currentRecord.balance = Long.fromString(balanceData.balance);
        };

        this.fetchAssetDefinition = function () {
            return this.endpoint.getAssetDefinition(this.asset).then(function (result) {
                _this.assetDefinition = result;
            });
        };
    }

    return AssetData;
});

module.service("TransactionBuilder", function ($q, $rootScope, $location) {

    var TransactionBuilder = function (endpoint) {
        var _this = this;

        sdk.TransactionBuilder.call(this, endpoint.apiService);

        this.uiSubmit = function (key) {
            $rootScope.submitTransaction = { transaction: _this, key: key };
            $location.path("/submit");
        };
    };

    TransactionBuilder.prototype = new sdk.TransactionBuilder({ namespace: "" });

    TransactionBuilder.uiError = function () {
        $rootScope.submitTransaction = null;
        $location.path("/submit");
    }

    return TransactionBuilder;
});