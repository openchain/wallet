var module = angular.module("OpenChainWallet.Models", []);
var bitcore = require("bitcore");

module.value("walletSettings", {
    hdKey: null,
    derivedKey: null,
    rootAccount: null,
    initialized: false,
    versionPrefix: "v1",
    network: null,
    setRootKey: function (key) {
        this.hdKey = key;
        this.network = key.network;
        this.derivedKey = key.derive(44, true).derive(22, true).derive(0, true).derive(0).derive(0);
        this.rootAccount = "/p2pkh/" + this.derivedKey.privateKey.toAddress().toString() + "/";
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
            return apiService.getValue(_this, encodingService.encodeData(assetPath + "asdef/")).then(function (result) {
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

module.service("TransactionBuilder", function ($q, apiService, protobufBuilder, encodingService) {

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
                newRecord["value"] = { "value": value };
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
            if (account.slice(0, 1) == "@") {
                var resolvedAccount = apiService.getData(_this.endpoint, "/aka/" + account.slice(1, account.length) + "/").then(function (result) {
                    if (result.data == null) {
                        return $q.reject("Unable to resolve the alias");
                    }
                    else {
                        _this.addRecord(result.key, null, result.version);
                        return $q.when(result.data);
                    }
                });
            }
            else {
                var resolvedAccount = $q.when(account);
            }

            return resolvedAccount.then(function (accountResult) {
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
    }

    return TransactionBuilder;
});