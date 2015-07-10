var module = angular.module("OpenChainWallet.Services", []);

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
            url: endpoint.rootUrl + "/query/accountentry",
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

module.service("protobufBuilder", function () {
    this.builder = dcodeIO.ProtoBuf.loadProtoFile("content/schema.proto");
    var root = this.builder.build();
    this.Transaction = root.OpenChain.Transaction;
    this.LedgerRecord = root.OpenChain.LedgerRecord;
});