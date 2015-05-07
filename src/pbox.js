/*global angular,$,kzi,_ */
/*jshint unused:false */
(function () {
    'use strict';
    angular.module('wt.pbox', [])
        .provider("$wtPosition", [function () {
            this.$get = ['$document', function ($document) {
                return {
                    calculatePos: function (options, $element, $boxElement) {
                        var elementTop = $element.offset().top,
                            elementLeft = $element.offset().left,
                            elementRight = $element.offset().right,
                            dicOuterWidth = $document.outerWidth(),
                            dicOuterHeight = $document.outerHeight(),
                            top, left, right, bottom,
                            elementOuterWidth = $element.outerWidth(),
                            elementOuterHeight = $element.outerHeight(),
                            boxWidth = $boxElement.outerWidth(true),
                            boxHeight = $boxElement.outerHeight(true);
                        switch (options.placement) {
                            case "bottom":
                                top = elementTop + elementOuterHeight + options.offset;
                                if (options.align === "left") {
                                    left = elementLeft;
                                } else if (options.align === "right") {
                                    left = elementLeft + elementOuterWidth - boxWidth;
                                }
                                else {
                                    left = elementLeft - boxWidth / 2 + elementOuterWidth / 2;
                                }

                                if (left < 0) {
                                    left = options.offset;
                                }
                                if (left + boxWidth > dicOuterWidth) {
                                    left = dicOuterWidth - boxWidth - options.offset;
                                }
                                if (top + boxHeight > dicOuterHeight) {
                                    top = elementTop - boxHeight - options.offset;
                                }
                                break;
                            case "top":
                                top = elementTop - boxHeight - options.offset;
                                left = elementLeft;
                                if (options.align === "left") {
                                    left = elementLeft;
                                } else if (options.align === "right") {
                                    left = elementLeft + elementOuterWidth - boxWidth;
                                }
                                else {
                                    left = elementLeft - boxWidth / 2 + elementOuterWidth / 2;
                                }

                                if (left < 0) {
                                    left = options.offset;
                                }
                                if (left + boxWidth > dicOuterWidth) {
                                    left = dicOuterWidth - boxWidth - options.offset;
                                }
                                if (top < boxHeight) {
                                    top = elementTop + elementOuterHeight + options.offset;
                                }
                                break;
                            case "left":
                                left = elementLeft - boxWidth - options.offset;
                                if (options.align === "top") {
                                    top = elementTop;
                                } else if (options.align === "bottom") {
                                    top = elementTop + elementOuterHeight - boxHeight;
                                }
                                else {
                                    top = elementTop - boxHeight / 2 + elementOuterHeight / 2;
                                }
                                if (left < 0) {
                                    left = elementLeft + elementOuterWidth + options.offset;
                                } else if (left + boxWidth > dicOuterWidth) {
                                    left = elementLeft + elementOuterWidth + options.offset;
                                }
                                if (top < 0) {
                                    top = options.offset;
                                } else if (top + boxHeight > dicOuterHeight) {
                                    top = dicOuterHeight - boxHeight - options.offset;
                                }
                                break;
                            case "right":
                                break;
                            default:
                                break;
                        }

                        if (top !== undefined) {
                            $boxElement.css("top", top);
                        }
                        if (left !== undefined) {
                            $boxElement.css("left", left);
                        }
                        if (right !== undefined) {
                            $boxElement.css("right", right);
                        }

                        if (options.animation === true) {
                            $boxElement.slideToggle("normal");
                        } else {
                            $boxElement.addClass(options.openClass);
                            $boxElement.removeClass(options.closeClass);
                        }
                        $element.addClass(options.openClass);
                    }
                }
            }];
        }])
        .provider("$pbox", [function () {
            // The default options for all popboxs.
            var defaultOptions = {
                placement : 'top',
                align     : null,
                animation : false,
                popupDelay: 0,
                arrow     : false,
                openClass : 'pbox-open',
                closeClass: 'pbox-close',
                autoClose : true,
                offset    : 1,
                resolve   : {}
            };

            var globalOptions = {
                triggerClass: "pbox-trigger"
            };

            this.options = function (value) {
                globalOptions = value;
            };

            var util = {
                hasClasses: function (element, classes) {
                    var result = false;
                    classes.forEach(function (className) {
                        if (result) {
                            return;
                        }
                        result = element.hasClass(className) || element.parents("." + className).length > 0;
                    });
                    return result;
                }
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
                "$wtPosition",
                function ($http, $document, $compile, $rootScope, $controller, $templateCache, $q, $injector, $timeout, $wtPosition) {

                    var $pbox = {}, $body = $document.find('body');

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

                        if (!options.event || !options.event.target) {
                            throw new Error("The event.target not be null.")
                        }

                        var $target = angular.element(options.event.target);
                        var $trigger = $target.parents("." + globalOptions.triggerClass);
                        if ($trigger.length > 0) {
                            $target = $trigger;
                        } else {
                            $target.addClass(globalOptions.triggerClass);
                        }
                        if ($target.data("pboxInstance")) {
                            return $target.data("pboxInstance").close();
                        }

                        options.placement = $target.data("placement") ? $target.data("placement") : options.placement;

                        //prepare an instance of a modal to be injected into controllers and returned to a caller
                        var pboxInstance = {
                            result : pboxResultDeferred.promise,
                            opened : pboxOpenedDeferred.promise,
                            close  : function () {
                                $target.removeData("pboxInstance");
                                pboxElement.remove();
                            },
                            dismiss: function (reason) {
                                //$modalStack.dismiss(modalInstance, reason);
                            }
                        };
                        $target.data("pboxInstance", pboxInstance);

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
                                pboxScope.$pboxInstance = pboxInstance;
                                angular.forEach(options.resolve, function (value, key) {
                                    ctrlLocals[key] = tplAndVars[resolveIter++];
                                });

                                ctrlInstance = $controller(options.controller, ctrlLocals);
                                pboxInstance.ctrlInstance = ctrlInstance;
                            }
                            pboxElement = angular.element('<div class="pbox"></div>');
                            pboxElement.html(tplAndVars[0]);
                            //outerElement.css({display: 'none'});
                            //pboxInstance._boxElement = outerElement;

                            $document.bind("mousedown.pbox", function (e) {
                                var _target = angular.element(e.target);
                                if (util.hasClasses(_target, ["pbox", globalOptions.triggerClass])) {
                                    return;
                                }
                                $document.unbind("mousedown.pbox");
                                pboxInstance.close();
                            });

                            $compile(pboxElement)(pboxScope);
                            $body.append(pboxElement);

                            $wtPosition.calculatePos(options, $target, pboxElement);

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
