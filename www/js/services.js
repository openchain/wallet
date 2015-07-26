var module = angular.module("OpenChainWallet.Services", []);
var bitcore = require("bitcore");
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;

module.service("apiService", function ($http, encodingService) {

    this.postTransaction = function (endpoint, encodedTransaction, key) {
        
        var transactionBuffer = new Uint8Array(encodedTransaction.toArrayBuffer());
        var hash = bitcore.crypto.Hash.sha256(bitcore.crypto.Hash.sha256(transactionBuffer));

        var signatureBuffer = bitcore.crypto.ECDSA().set({
            hashbuf: hash,
            endian: "big",
            privkey: key.privateKey
        }).sign().sig.toBuffer();

        return $http.post(
            endpoint.rootUrl + "/submit",
            {
                transaction: encodedTransaction.toHex(),
                signatures: [
                    {
                        pub_key: ByteBuffer.wrap(key.publicKey.toBuffer()).toHex(),
                        signature: ByteBuffer.wrap(signatureBuffer).toHex()
                    }
                ]
            });
    }

    this.getValue = function (endpoint, key) {
        return $http({
            url: endpoint.rootUrl + "/value",
            method: "GET",
            params: { key: key.toHex() }
        }).then(function (result) {
            return {
                key: key,
                value: ByteBuffer.fromHex(result.data.value),
                version: ByteBuffer.fromHex(result.data.version)
            };
        });
    }

    this.getLedgerInfo = function (rootUrl) {
        return $http({
            url: rootUrl + "/info",
            method: "GET"
        });
    }

    this.getAccount = function (endpoint, account, asset) {
        return this.getValue(endpoint, encodingService.encodeAccount(account, asset)).then(function (result) {
            var accountResult = {
                key: result.key,
                account: account,
                asset: asset,
                version: result.version
            };

            if (result.value.remaining() == 0) {
                // Unset value
                accountResult["balance"] = Long.ZERO;
            }
            else {
                accountResult["balance"] = encodingService.decodeInt64(result.value);
            }

            return accountResult;
        });
    }

    this.getAlias = function (endpoint, alias) {
        return this.getValue(endpoint, encodingService.encodeAlias(alias)).then(function (result) {
            var accountResult = {
                key: result.key,
                alias: alias,
                version: result.version
            };

            if (result.value.remaining() == 0) {
                // Unset value
                accountResult["path"] = null;
            }
            else {
                accountResult["path"] = encodingService.decodeString(result.value);
            }

            return accountResult;
        });
    }

    this.getAccountAssets = function (endpoint, account) {
        return $http({
            url: endpoint.rootUrl + "/query/account",
            method: "GET",
            params: { account: account }
        }).then(function (result) {
            return result.data.map(function (item) {
                return {
                    key: encodingService.encodeAccount(item.account, item.asset),
                    account: item.account,
                    asset: item.asset,
                    version: ByteBuffer.fromHex(item.version),
                    balance: Long.fromString(item.balance)
                };
            });
        });
    }

    //this.getSubaccounts = function (endpoint, account) {
    //    return $http({
    //        url: endpoint.rootUrl + "/query/subaccounts",
    //        method: "GET",
    //        params: { account: account }
    //    });
    //}
});

module.service("endpointManager", function (apiService, walletSettings, Endpoint) {
    var nextEndpointId = 0;
    var storedEndpoints = localStorage[walletSettings.versionPrefix + ".endpoints"];

    if (storedEndpoints)
        var initialEndpoints = JSON.parse(storedEndpoints);
    else
        var initialEndpoints = {};

    this.endpoints = {};

    for (var key in initialEndpoints) {
        if (key >= nextEndpointId)
            nextEndpointId = key + 1;

        this.endpoints[key] = new Endpoint(initialEndpoints[key]);
    }

    this.addEndpoint = function (endpoint) {
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

module.service("encodingService", function () {
    var _this = this;

    this.encodeString = function (value) {
        return ByteBuffer.wrap(value, "utf8", true);
    };

    this.encodeAccount = function (account, asset) {
        return _this.encodeString(account + ":ACC:" + asset);
    };

    this.encodeAlias = function (path) {
        return _this.encodeString(path + ":ALIAS");
    }

    this.encodeAssetDefinition = function (path) {
        return _this.encodeString(path + ":ASDEF");
    }

    this.encodeInt64 = function (value, usage) {
        var result = new ByteBuffer(null, true);
        result.BE();
        result.writeInt64(value);
        result.flip();
        return result;
    };

    this.decodeInt64 = function (buffer) {
        buffer.BE();
        var result = buffer.readInt64();
        return result;
    };

    this.decodeString = function (buffer) {
        var result = buffer.readUTF8String(buffer.remaining());
        return result;
    };
});

module.service("protobufBuilder", function () {
    var _this = this;

    dcodeIO.ProtoBuf.loadProtoFile("content/schema.proto", function (e, builder) {
        var root = builder.build();
        _this.Mutation = root.OpenChain.Mutation;
        _this.Transaction = root.OpenChain.Transaction;
    });
});

module.service("validator", function () {
    var _this = this;

    this.isNumber = function (number) {
        var regex = /^[\-]?\d+(\.\d+)?$/;
        return regex.test(number);
    }
});