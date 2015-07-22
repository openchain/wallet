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
            .when("/manageassets", {
                templateUrl: "views/manageassets.html",
                controller: "ManageAssetsController"
            })
            .when("/addendpoint", {
                templateUrl: "views/addendpoint.html",
                controller: "AddEndpointController"
            })
            .when("/admin", {
                templateUrl: "views/admin.html",
                controller: "AdminController"
            })
            .otherwise({
                redirectTo: '/'
            });
    }])
    .directive("assetItem", function () {
        return {
            restrict: 'A',
            templateUrl: 'views/directives/assetitem.html',
            replace: false
        };
    })
    .run(function ($rootScope, $window) {
        $rootScope.logOut = function () { $window.location.reload(); };
    });

angular.module("OpenChainWallet.Controllers", []);