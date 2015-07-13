var module = angular.module("OpenChainWallet.Models", []);

module.value("walletSettings", {
    hdKey: null,
    derived_key: null,
    rootAccount: null,
    initialized: false
});

module.service("endpointManager", function (apiService) {
    var nextEndpointId = 0;
    var storedEndpoints = localStorage["endpoints-000"];

    if (storedEndpoints)
        this.endpoints = JSON.parse(storedEndpoints);
    else
        this.endpoints = {};

    for (var key in this.endpoints)
        if (key >= nextEndpointId)
            nextEndpointId = key + 1;

    this.addEndpoint = function(endpoint) {
        var newEndpoint = {
            id: nextEndpointId++,
            rootUrl: endpoint.root_url,
            name: endpoint.name
        };

        this.endpoints[newEndpoint.id] = newEndpoint;
        localStorage["endpoints-000"] = JSON.stringify(this.endpoints);
    };
});