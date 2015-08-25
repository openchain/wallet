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

var module = angular.module("OpenChainWallet.Models", []);
var bitcore = require("bitcore");

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

module.factory("Endpoint", function ($q, apiService, encodingService) {

    var Endpoint = function (properties) {
        var _this = this;

        this.properties = properties;
        this.rootUrl = properties.rootUrl;
        this.assets = {};

        this.downloadAssetDefinition = function (assetPath) {
            return apiService.getValue(_this, encodingService.encodeData(assetPath, "asdef")).then(function (result) {
                if (result.value.remaining() == 0) {
                    return { key: result.key, value: null, version: result.version };
                }
                else {
                    return { key: result.key, value: JSON.parse(encodingService.decodeString(result.value)), version: result.version };
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

module.factory("AssetData", function ($q, apiService, encodingService) {

    var AssetData = function (endpoint, assetPath) {
        var _this = this;

        this.asset = assetPath;
        this.endpoint = endpoint;

        if (endpoint.rootUrl.slice(endpoint.rootUrl.length - 1, endpoint.rootUrl.length) == "/") {
            this.fullPath = endpoint.rootUrl + assetPath.slice(1, assetPath.length);
        }
        else {
            this.fullPath = endpoint.rootUrl + assetPath;
        }

        this.setAccountBalance = function (balanceData) {
            _this.currentRecord = balanceData;
        };

        this.fetchAssetDefinition = function () {
            return this.endpoint.getAssetDefinition(this.asset).then(function(result) {
                _this.assetDefinition = result;
            });
        };
    }

    return AssetData;
});

module.factory("LedgerRecord", function (LedgerPath, encodingService) {
    var LedgerRecord = function (path, recordType, name) {
        var _this = this;

        this.path = LedgerPath.parse(path);
        this.recordType = recordType;
        this.name = name;
        
        this.toString = function () {
            return _this.path.toString() + ":" + _this.recordType + ":" + _this.name;
        };

        this.toByteBuffer = function () {
            return ByteBuffer.wrap(_this.toString(), "utf8", true);
        };
    }

    LedgerRecord.parse = function (value) {
        var text = value;
        if (typeof text !== "string") {
            text = encodingService.decodeString(text);
        }

        var parts = text.split(":");

        if (parts.length < 3) {
            throw "Invalid record key";
        }

        return new LedgerRecord(parts[0], parts[1], parts.slice(2, parts.length).join(":"));
    };

    return LedgerRecord;
});

module.factory("LedgerPath", function () {
    var LedgerPath = function (parts) {
        var _this = this;

        this.parts = parts;

        this.toString = function () {
            return "/" + _this.parts.map(function (item) { return item + "/" }).join("");
        };
    }

    LedgerPath.parse = function (value) {
        var parts = value.split("/");

        if (parts.length < 2 || parts[0] != "" || parts[parts.length - 1] != "") {
            throw "Invalid path";
        }

        return new LedgerPath(parts.slice(1, parts.length - 1));
    };

    return LedgerPath;
});

module.service("TransactionBuilder", function ($q, $rootScope, $location, apiService, protobufBuilder, encodingService) {

    var TransactionBuilder = function (endpoint) {
        var _this = this;

        this.endpoint = endpoint;
        this.records = [];

        this.addRecord = function (key, value, version) {
            var newRecord = {
                "key": key,
                "version": version
            };

            if (value != null) {
                newRecord["value"] = { "data": value };
            }
            else {
                newRecord["value"] = null;
            }

            _this.records.push(newRecord);

            return _this;
        };

        this.addAccountRecord = function(previous, change) {
            return _this.addRecord(
                previous.key,
                encodingService.encodeInt64(previous.balance.add(change)),
                previous.version);
        };

        this.fetchAndAddAccountRecord = function (account, asset, change) {
            // Resolve name accounts
            if (account.slice(0, 1) == "@") {
                account = "/aka/" + account.slice(1, account.length) + "/";
            }

            return apiService.getData(_this.endpoint, account, "goto").then(function (result) {
                if (result.data == null) {
                    return account;
                }
                else {
                    // If a goto DATA record exists, we use the redirected path
                    _this.addRecord(result.key, null, result.version);
                    return result.data;
                }
            }).then(function (accountResult) {
                return apiService.getAccount(_this.endpoint, accountResult, asset);
            })
            .then(function (currentRecord) {
                _this.addAccountRecord(currentRecord, change);
            });
        }

        this.submit = function (key) {
            var constructedTransaction = new protobufBuilder.Mutation({
                "namespace": encodingService.encodeString(_this.endpoint.rootUrl),
                "records": _this.records,
                "metadata": ByteBuffer.fromHex("")
            });
            
            return apiService.postTransaction(_this.endpoint, constructedTransaction.encode(), key);
        };

        this.uiSubmit = function (key) {
            $rootScope.submitTransaction = { transaction: _this, key: key };
            $location.path("/submit");
        };
    }

    return TransactionBuilder;
});