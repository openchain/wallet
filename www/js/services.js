var module = angular.module("OpenChainWallet.Services", []);
var ByteBuffer = dcodeIO.ByteBuffer;
var Long = dcodeIO.Long;

module.service("apiService", function ($http, encodingService, walletSettings) {

    this.postTransaction = function (endpoint, transaction) {
        var encodedTransaction = transaction.encode();
        return $http.post(
            endpoint.rootUrl + "/submit",
            {
                transaction: encodedTransaction.toHex(),
                signatures: [
                    {
                        pub_key: ByteBuffer.wrap(walletSettings.derivedKey.publicKey.toBuffer()).toHex(),
                        signature: ByteBuffer.wrap(walletSettings.sign(encodedTransaction)).toHex()
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

    this.getAccountAssets = function (endpoint, account) {
        return $http({
            url: endpoint.rootUrl + "/query/account",
            method: "GET",
            params: { account: account }
        });
    }

    this.getSubaccounts = function (endpoint, account) {
        return $http({
            url: endpoint.rootUrl + "/query/subaccounts",
            method: "GET",
            params: { account: account }
        });
    }
});

module.service("encodingService", function () {
    this.encodeNamespace = function (namespace) {
        return ByteBuffer.wrap(namespace, "utf8", true);
    };

    this.encodeAccount = function (account, asset) {
        var result = new ByteBuffer(null, true);
        result.writeInt32(256);
        result.writeIString(account);
        result.writeIString(asset);
        result.flip();
        return result;
    };

    this.encodeInt64 = function (value) {
        var result = new ByteBuffer(null, true);
        result.writeInt32(2);
        result.writeInt64(value);
        result.flip();
        return result;
    };

    this.encodeString = function (value, usage) {
        var result = new ByteBuffer(null, true);
        result.writeInt32(usage);
        result.writeIString(value);
        result.flip();
        return result;
    };

    this.decodeInt64 = function (buffer) {
        buffer.LE();
        var usage = buffer.readInt32();
        var result = buffer.readInt64();
        return result;
    };

    this.decodeString = function (buffer) {
        buffer.LE();
        var usage = buffer.readInt32();
        var result = buffer.readIString();
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