var app =
    angular.module('OpenChainWallet', [
        "ngRoute",
        "OpenChainWallet.Models",
        "OpenChainWallet.Controllers",
        "OpenChainWallet.Services",
    ])
    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when("/", {
                templateUrl: "views/home.html",
                controller: "HomeController"
            })
            .when("/signin", {
                templateUrl: "views/signin.html",
                controller: "SignInController"
            })
            .when("/send", {
                templateUrl: "views/send.html",
                controller: "SendController"
            })
            .otherwise({
                redirectTo: '/'
            });
    }]);