var module = angular.module("OpenChainWallet.Services", []);
var ByteBuffer = dcodeIO.ByteBuffer;

module.service("apiService", function ($http) {

    this.postTransaction = function (endpoint, transaction) {
        return $http.post(
            endpoint.rootUrl + "/submit",
            {
                transaction: transaction.encode().toHex(),
                authentication: [ ]
            });
    }

    this.getLedgerInfo = function (rootUrl) {
        return $http({
            url: rootUrl + "/info",
            method: "GET"
        });
    }

    this.getAccountStatus = function (endpoint, account, asset) {
        return $http({
            url: endpoint.rootUrl + "/query/accountentries",
            method: "GET",
            params: { account: account, asset: asset }
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
});

module.service("protobufBuilder", function () {
    var _this = this;

    dcodeIO.ProtoBuf.loadProtoFile("content/schema.proto", function (e, builder) {
        var root = builder.build();
        _this.Mutation = root.OpenChain.Mutation;
        _this.Transaction = root.OpenChain.Transaction;
    });
});