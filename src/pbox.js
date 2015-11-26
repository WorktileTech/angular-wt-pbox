(function () {
    'use strict';
    angular.module('wt.pbox', [])
        .provider("$wtPosition", [function () {
            this.$get = ['$document', function ($document) {
                return {
                    calculatePos: function (options, $element, $boxElement) {
                        var elementTop = $element.offset().top,
                            elementLeft = $element.offset().left,
                            docClientWidth = document.documentElement.clientWidth,
                            docClientHeight = document.documentElement.clientHeight,

                            elementOuterWidth = $element.outerWidth(),
                            elementOuterHeight = $element.outerHeight(),
                            boxWidth = $boxElement.outerWidth(true),
                            boxHeight = $boxElement.outerHeight(true),
                            top, left, right, bottom;
                        if ((options.top !== undefined || options.bottom !== undefined) && (options.left !== undefined || options.right !== undefined)) {
                            top = options.top;
                            bottom = options.bottom;
                            left = options.left;
                            right = options.right;
                        } else {
                            var calLeftRight = function () {
                                if (options.align === "left") {
                                    left = elementLeft;
                                    if (left + boxWidth > docClientWidth) {
                                        left = docClientWidth - boxWidth - options.offset;
                                    }
                                } else if (options.align === "right") {
                                    right = docClientWidth - elementLeft - elementOuterWidth;
                                    left = undefined;
                                    if (right + boxWidth > docClientWidth) {
                                        right = options.offset;
                                    }
                                }
                                else {
                                    left = elementLeft - boxWidth / 2 + elementOuterWidth / 2;
                                    if (left < 0) {
                                        left = options.offset;
                                    } else if (left + boxWidth > docClientWidth) {
                                        left = docClientWidth - boxWidth - options.offset;
                                    }
                                }
                            };

                            var calTopBottom = function () {
                                if (options.align === "top") {
                                    top = elementTop;
                                    if (top + boxHeight > docClientHeight) {
                                        top = docClientHeight - boxHeight;
                                    }
                                } else if (options.align === "bottom") {
                                    bottom = docClientHeight - elementTop - elementOuterHeight;
                                    if (bottom + boxHeight > docClientHeight) {
                                        bottom = docClientHeight - boxHeight;
                                    }
                                }
                                else {
                                    top = ~~(elementTop - boxHeight / 2 + elementOuterHeight / 2);
                                    if (top < 0) {
                                        top = options.offset;
                                    } else if (top + boxHeight > docClientHeight) {
                                        top = docClientHeight - boxHeight + options.offset;
                                    }
                                }
                            };

                            switch (options.placement) {
                                case "bottom":
                                    top = elementTop + elementOuterHeight + options.offset;
                                    calLeftRight();
                                    if (options.autoAdapt && top + boxHeight > docClientHeight) {
                                        top = undefined;
                                        bottom = docClientHeight - elementTop + options.offset;
                                        if (bottom + boxHeight > docClientHeight) {
                                            top = options.offset;
                                            bottom = undefined;
                                        }
                                    }
                                    break;
                                case "top":
                                    bottom = docClientHeight - elementTop + options.offset;
                                    if (options.autoAdapt && bottom + boxHeight > docClientHeight) {
                                        bottom = undefined;
                                        top = elementTop + elementOuterHeight + options.offset;
                                        if (top + boxHeight > docClientWidth) {
                                            top = undefined;
                                            bottom = docClientHeight - boxHeight + options.offset;
                                        }
                                    }
                                    calLeftRight();
                                    break;
                                case "left":
                                    right = ~~(docClientWidth - elementLeft + options.offset);
                                    if (options.autoAdapt && right + boxWidth + options.offset > docClientWidth) {
                                        right = undefined;
                                        left = ~~(elementLeft + elementOuterWidth + options.offset);
                                    }
                                    calTopBottom();
                                    break;
                                case "right":
                                    left = elementLeft + elementOuterWidth + options.offset;
                                    if (options.autoAdapt && left + boxWidth + options.offset > docClientWidth) {
                                        left = undefined;
                                        right = docClientWidth - elementLeft + options.offset;
                                    }
                                    calTopBottom();
                                    break;
                                default:
                                    break;
                            }
                        }

                        if (top !== undefined) {
                            $boxElement.css("top", top);
                        }
                        if (bottom) {
                            $boxElement.css("bottom", bottom);
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
                placement: 'bottom',
                align: null,
                animation: false,
                popupDelay: 0,
                arrow: false,
                openClass: 'pbox-open',
                closeClass: 'pbox-close',
                autoClose: true,
                offset: 1,
                autoAdapt: true,
                resolve: {}
            };

            var globalOptions = {
                triggerClass: "pbox-trigger",
                boxInstanceName: "boxInstance"
            };

            this.options = function (value) {
                globalOptions = value;
            };

            var util = {
                hasClass: function (element, className) {
                    return element.hasClass(className) || element.parents("." + className).length > 0;
                },
                hasClasses: function (element, classes) {
                    var result = false;
                    classes.forEach(function (className) {
                        if (result) {
                            return;
                        }
                        result = util.hasClass(element, className);
                    });
                    return result;
                },
                getTarget: function (event) {
                    var $target = angular.element(event.target);
                    if (!$target) {
                        throw new Error("The event")
                    }
                    if ($target.hasClass(globalOptions.triggerClass)) {
                        return $target
                    }
                    var $trigger = $target.parents("." + globalOptions.triggerClass);
                    if ($trigger.length > 0) {
                        $target = $trigger;
                    } else {
                        $target.addClass(globalOptions.triggerClass);
                    }
                    return $target;
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

                    var $pbox = {openedElement: null}, $body = angular.element(document.body);

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

                    function BoxModal(options, $target) {
                        var _resultDeferred = $q.defer();
                        var _openedDeferred = $q.defer();
                        var _self = this;
                        this._id = new Date().getTime() + Math.random().toString(36).substr(2);
                        this.resultDeferred = _resultDeferred;
                        this.openedDeferred = _openedDeferred;
                        this.result = _resultDeferred.promise;
                        this.opened = _openedDeferred.promise;
                        this._options = options;
                        this._pboxElement = null;
                        this._$target = $target;
                        $target.data(globalOptions.boxInstanceName, _self);

                        BoxModal.prototype._remove = function () {
                            this._$target.removeData(globalOptions.boxInstanceName);
                            this._$target.removeClass(this._options.openClass);
                            this._pboxElement && this._pboxElement.remove();
                        };

                        BoxModal.prototype._bindEvents = function () {
                            var _self = this;
                            $document.bind("click.pbox" + this._id, function (e) {
                                var _eTarget = angular.element(e.target);
                                if (util.hasClass(_eTarget, 'pbox')) {
                                    return;
                                }
                                if (util.hasClass(_eTarget, globalOptions.triggerClass)) {
                                    var isResult = false;
                                    var _target = util.getTarget(e);
                                    if (_target && _target.data(globalOptions.boxInstanceName)) {
                                        var instance = _target.data(globalOptions.boxInstanceName);
                                        if (instance === _self) {
                                            isResult = true;
                                        }
                                    }
                                    if (isResult) {
                                        return;
                                    }
                                }
                                _self.close();
                            });
                        };

                        BoxModal.prototype.open = function (tpl, scope) {
                            this._pboxElement = angular.element('<div class="pbox"></div>');
                            this._pboxElement.html(tpl);
                            this._$target.addClass(this._options.openClass);
                            //$pbox.openedElement =  this._pboxElement;
                            $compile(this._pboxElement)(scope);
                            $body.append(this._pboxElement);
                            $timeout(function () {
                                $wtPosition.calculatePos(_self._options, $target, _self._pboxElement);
                            });
                            this._bindEvents();
                        };

                        BoxModal.prototype.close = function (result) {
                            this._remove();
                            $document.unbind("click.pbox" + this._id);
                            _resultDeferred.resolve(result);
                        };

                        BoxModal.prototype.dismiss = function (reason) {
                            this._remove();
                            _resultDeferred.reject(reason);
                        }
                    }

                    $pbox.open = function (options) {

                        //merge and clean up options
                        options = angular.extend({}, defaultOptions, options);
                        options.resolve = options.resolve || {};

                        //verify options
                        if (!options.template && !options.templateUrl) {
                            throw new Error('One of template or templateUrl options is required.');
                        }
                        if (!options.event || !options.event.target) {
                            throw new Error("The event.target not be null.")
                        }

                        //verify is exists pbox,if exists close it and return,else open continue...
                        var $target = util.getTarget(options.event);
                        options.placement = $target.data("placement") ? $target.data("placement") : options.placement;
                        options.align = $target.data("align") ? $target.data("align") : options.align;
                        options.autoAdapt = $target.data("auto-adapt") !== undefined ? $target.data("auto-adapt") : options.autoAdapt;

                        if ($target.data(globalOptions.boxInstanceName)) {
                            $target.data(globalOptions.boxInstanceName).close();
                            //fix click error when user result.then();
                            return {result: $q.defer().promise};
                        }

                        var pboxInstance = new BoxModal(options, $target);

                        var templateAndResolvePromise =
                            $q.all([getTemplatePromise(options)].concat(getResolvePromises(options.resolve)));

                        templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {

                            var boxScope = (options.scope || $rootScope).$new();
                            boxScope.$close = pboxInstance.close;
                            boxScope.$dismiss = pboxInstance.dismiss;

                            var ctrlInstance, ctrlLocals = {};
                            var resolveIter = 1;

                            //controllers
                            if (options.controller) {
                                ctrlLocals.$scope = boxScope;
                                ctrlLocals.$pboxInstance = pboxInstance;
                                boxScope.$pboxInstance = pboxInstance;
                                angular.forEach(options.resolve, function (value, key) {
                                    ctrlLocals[key] = tplAndVars[resolveIter++];
                                });

                                ctrlInstance = $controller(options.controller, ctrlLocals);
                                pboxInstance.ctrlInstance = ctrlInstance;
                                if (options.controllerAs) {
                                    boxScope[options.controllerAs] = ctrlInstance;
                                }
                            }

                            pboxInstance.open(tplAndVars[0], boxScope);

                        }, function resolveError(reason) {
                            pboxInstance.resultDeferred.reject(reason);
                        });

                        templateAndResolvePromise.then(function () {
                            pboxInstance.openedDeferred.resolve(true);
                        }, function () {
                            pboxInstance.openedDeferred.reject(false);
                        });

                        return pboxInstance;
                    };

                    return $pbox;
                }
            ];
        }]);
})();
