var module = angular.module("OpenChainWallet.Services", []);

module.service("openChainApiService", function ($http) {

    this.getTransactionStream = function (from) {
        return $http.get("http://localhost:5000/stream?from=");
    }

    this.postTransaction = function (transaction) {
        return $http.post(
            "http://localhost:5000/submit",
            {
                transaction: transaction.encode().toHex(),
                authentication: [ ]
            });
    }

    this.getAccountStatus = function (account, asset) {
        return $http({
            url: "http://localhost:5000/query/accountentry",
            method: "GET",
            params: { account: account, asset: asset }
        });
    }

    this.getSubaccounts = function (account) {
        return $http({
            url: "http://localhost:5000/query/subaccounts",
            method: "GET",
            params: { account: account }
        });
    }
});

module.service("protobufBuilder", function () {
    this.builder = dcodeIO.ProtoBuf.loadProtoFile("content/schema.proto");
    var root = this.builder.build();
    this.Transaction = root.OpenChain.Transaction;
    this.LedgerRecord = root.OpenChain.LedgerRecord;
});