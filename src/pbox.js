/*global angular,$,kzi,_ */
/*jshint unused:false */
(function () {
    'use strict';
    angular.module('wt.pbox', [])
        .provider("$pbox", [function () {
            // The default options for all popboxs.
            var defaultOptions = {
                placement: 'top',
                align: null,
                animation: true,
                popupDelay: 0,
                arrow: false,
                popboxClass: 'popbox',
                transitionClass: 'fade',
                triggerClass: 'in',
                popboxOpenClass: 'popbox-open',
                resolve: {},
                backdropFade: false,
                popboxFade: false,
                keyboard: true, // close with esc key
                backdropClick: true, // only in conjunction with backdrop=true
                autoAdapt: false
            };

            var globalOptions = {}, DEFAULT_OFFSET = 2, FIXED_TOP_HEIGHT = 58;

            this.options = function (value) {
                globalOptions = value;
            };

            this.$get = [
                "$http",
                "$document",
                "$compile",
                "$rootScope",
                "$controller",
                "$templateCache",
                "$q",
                "$injector",
                "$timeout",
                function ($http, $document, $compile, $rootScope, $controller, $templateCache, $q, $injector, $timeout) {

                    var $pbox = {};

                    function getTemplatePromise(options) {
                        return options.template ? $q.when(options.template) :
                            $http.get(options.templateUrl, {cache: $templateCache}).then(function (result) {
                                return result.data;
                            });
                    }

                    function getResolvePromises(resolves) {
                        var promisesArr = [];
                        angular.forEach(resolves, function (value, key) {
                            if (angular.isFunction(value) || angular.isArray(value)) {
                                promisesArr.push($q.when($injector.invoke(value)));
                            }
                        });
                        return promisesArr;
                    }

                    $pbox.open = function (options) {

                        var pboxResultDeferred = $q.defer();
                        var pboxOpenedDeferred = $q.defer();
                        var pboxElement = null;

                        //prepare an instance of a modal to be injected into controllers and returned to a caller
                        var pboxInstance = {
                            result: pboxResultDeferred.promise,
                            opened: pboxOpenedDeferred.promise,
                            close: function () {
                                document.body.removeChild(pboxElement);
                            },
                            dismiss: function (reason) {
                                //$modalStack.dismiss(modalInstance, reason);
                            }
                        };

                        //merge and clean up options
                        options = angular.extend({}, defaultOptions, options);
                        options.resolve = options.resolve || {};

                        //verify options
                        if (!options.template && !options.templateUrl) {
                            throw new Error('One of template or templateUrl options is required.');
                        }

                        var templateAndResolvePromise =
                            $q.all([getTemplatePromise(options)].concat(getResolvePromises(options.resolve)));


                        templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {

                            var pboxScope = (options.scope || $rootScope).$new();
                            pboxScope.$close = options.close;
                            pboxScope.$dismiss = options.dismiss;

                            var ctrlInstance, ctrlLocals = {};
                            var resolveIter = 1;

                            //controllers
                            if (options.controller) {
                                ctrlLocals.$scope = pboxScope;
                                ctrlLocals.$pboxInstance = pboxInstance;
                                angular.forEach(options.resolve, function (value, key) {
                                    ctrlLocals[key] = tplAndVars[resolveIter++];
                                });

                                ctrlInstance = $controller(options.controller, ctrlLocals);
                                pboxInstance.ctrlInstance = ctrlInstance;
                            }
                            var outerElement = angular.element('<div class="pbox"></div>');
                            outerElement.html(tplAndVars[0]);
                            outerElement = $compile(outerElement)(pboxScope);
                            pboxElement = outerElement[0];
                            document.body.appendChild(outerElement[0]);

                        }, function resolveError(reason) {
                            pboxResultDeferred.reject(reason);
                        });

                        templateAndResolvePromise.then(function () {
                            pboxOpenedDeferred.resolve(true);
                        }, function () {
                            pboxOpenedDeferred.reject(false);
                        });

                        return pboxInstance;
                    };

                    return $pbox;
                }
            ];
        }]);
})();
