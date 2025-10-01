/**
 * Regenerator runtime polyfill for async/await support
 * This provides the functionality needed for Babel-transpiled code
 */

if (typeof regeneratorRuntime === 'undefined') {
  window.regeneratorRuntime = {
    mark: function(genFun) {
      genFun.__proto__ = GeneratorFunctionPrototype;
      genFun.prototype = Object.create(GeneratorPrototype);
      return genFun;
    },

    wrap: function(innerFn, outerFn, self, tryLocsList) {
      var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
      var generator = Object.create(protoGenerator.prototype);
      var context = new Context(tryLocsList || []);

      generator._invoke = makeInvokeMethod(innerFn, self, context);
      return generator;
    },

    awrap: function(arg) {
      return { __await: arg };
    },

    async: function(innerFn, outerFn, self, tryLocsList) {
      var iter = this.wrap(innerFn, outerFn, self, tryLocsList);

      return new Promise(function(resolve, reject) {
        function step(method, arg) {
          try {
            var record = iter[method](arg);
            var value = record.value;

            if (value && typeof value === "object" && value.hasOwnProperty("__await")) {
              return Promise.resolve(value.__await).then(function(value) {
                step("next", value);
              }, function(err) {
                step("throw", err);
              });
            }

            return Promise.resolve(value).then(function(unwrapped) {
              record.value = unwrapped;
              resolve(record);
            }, function(error) {
              return step("throw", error);
            });
          } catch (error) {
            reject(error);
          }
        }

        step("next");
      });
    }
  };

  // Basic Generator implementation
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  var GeneratorPrototype = {};
  GeneratorPrototype[Symbol.iterator] = function () { return this; };

  GeneratorPrototype.next = function(arg) {
    return this._invoke("next", arg);
  };

  GeneratorPrototype.throw = function(arg) {
    return this._invoke("throw", arg);
  };

  GeneratorPrototype.return = function(arg) {
    return this._invoke("return", arg);
  };

  function Context(tryLocsList) {
    this.tryEntries = tryLocsList;
    this.reset(true);
  }

  Context.prototype = {
    constructor: Context,
    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;
      this.method = "next";
      this.arg = undefined;
    }
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = "start";

    return function invoke(method, arg) {
      if (state === "completed") {
        if (method === "throw") {
          throw arg;
        }
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        if (context.method === "next") {
          context.sent = context._sent = context.arg;
        }

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          state = context.done ? "completed" : "suspendedYield";

          if (record.arg === continueValue) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };
        }
      }
    };
  }

  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var continueValue = {};

  function doneResult() {
    return { value: undefined, done: true };
  }
}