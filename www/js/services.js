var module = angular.module("OpenChainWallet.Services", []);
var ByteBuffer = dcodeIO.ByteBuffer;

module.service("apiService", function ($http, encodingService) {

    this.postTransaction = function (endpoint, transaction) {
        return $http.post(
            endpoint.rootUrl + "/submit",
            {
                transaction: transaction.encode().toHex(),
                authentication: [ ]
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
                value: result.data.value == null ? null : ByteBuffer.fromHex(result.data.value),
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

    this.getAccountStatus = function (endpoint, account, asset) {
        //return this.getValue(endpoint, encodingService.encodeAccount(account, asset)).then(function (result) {
        //    var result = {
        //        account: account,
        //        asset: asset,
        //        version: result.data.version
        //    };

        //    if (result.data.value == null) {
        //        result["balance"] = 0;
        //    }
        //    else {
        //        result["balance"] = encodingService.decodeInt64(result.data.value);
        //    }

        //    return result;
        //});
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
        result.writeInt32(1);
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