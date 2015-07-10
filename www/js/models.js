var module = angular.module("OpenChainWallet.Models", []);

module.value("walletSettings", {
    hd_key: null,
    derived_key: null,
    root_account: null,
    initialized: false
});

module.service("endpointManager", function (apiService) {
    var nextEndpointId = 0;
    this.endpoints = { };

    this.addEndpoint = function(endpoint) {
        var newEndpoint = {
            id: nextEndpointId++,
            rootUrl: endpoint.root_url,
            name: endpoint.name
        };

        this.endpoints[newEndpoint.id] = newEndpoint;
    };
});