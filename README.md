wt-pbox 基于 Angular.js 的弹出层插件
=========

## 为什么不使用 ui-bootstrap 的 dropdown？
1. ui-bootstrap 的 dropdown 不支持动态编译模板，不适合列表中弹出复杂交互的层
2. 弹出层的位置只有上下，不能左右或者根据框体大小或者位置情况自动调节


## 安装
执行 `bower install angular-wtpbox`


## 使用示例

```
 <button data-placement="left" ng-click="open($event)">open</button>

  $scope.open = function ($event) {
     var pbox = $pbox.open({
         event      : $event,
         templateUrl: "box.html",
         //template  : '<div><a>ssss111111 {{aaa}}</a> dddd <button ng-click="add()">click</button></div>',
         controller : function ($scope, $pboxInstance) {
             $scope.aaa = "sss";
             $scope.add = function () {
                 $scope.aaa = "bbbbbb";
             }
         }
     });
     pbox.result.then(function (result) {
         alert("close,result:" + result);
     }, function () {
         alert("dismiss");
     });
 };
```

## 参数说明

...
