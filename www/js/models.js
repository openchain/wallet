var module = angular.module("OpenChainWallet.Models", []);

module.value("walletSettings", {
    hd_key: null,
    derived_key: null,
    root_account: null,
    initialized: false
});
