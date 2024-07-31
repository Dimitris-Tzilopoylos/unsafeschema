var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var ValidationService = require("easy-validation-service");
var SchemaError = require("./error").SchemaError;
var Value = /** @class */ (function () {
    function Value(value) {
        this.value = value;
        this.errors = [];
    }
    Value.prototype.set = function (value) {
        this.value = value;
    };
    Value.prototype.setErrors = function () {
        var errors = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            errors[_i] = arguments[_i];
        }
        this.errors = errors || [];
    };
    return Value;
}());
var Schema = /** @class */ (function () {
    function Schema() {
    }
    Schema.object = function (value) {
        if (value === void 0) { value = {}; }
        if (!ValidationService.isObject(value)) {
            throw new SchemaError("value is not an object");
        }
        return new ObjectSchemaParser(value);
    };
    Schema.array = function (value) {
        return new ArraySchemaParser(value);
    };
    Schema.string = function () {
        return new StringSchemaParser();
    };
    Schema.number = function () {
        return new NumberSchemaParser();
    };
    Schema.boolean = function () {
        return new BooleanSchemaParser();
    };
    Schema["null"] = function () {
        return new NullSchemaParser();
    };
    Schema.undefined = function () {
        return new UndefinedSchemaParser();
    };
    Schema.date = function () {
        return new DateSchemaParser();
    };
    Schema.types = {
        array: "array",
        object: "object",
        string: "string",
        number: "number",
        "null": "null",
        undefined: "undefined",
        boolean: "boolean",
        date: "date"
    };
    return Schema;
}());
var Validator = /** @class */ (function () {
    function Validator() {
        this.value = undefined;
        this.stack = [];
        this.errors = [];
        this.nullEngaged = false;
        this.undefinedWasEngaged = false;
        this.defaultEngaged = false;
        this._defaultValue = undefined;
    }
    Validator.prototype._evaluateWithError = function (cb, err) {
        return function (value) {
            var result = cb(value);
            if (!result && err) {
                value.errors.push(err);
            }
            return result;
        };
    };
    Validator.prototype.append = function (cb) {
        this.stack.push(cb);
    };
    Validator.prototype.validateObj = function (value) {
        if (this.nullEngaged && ValidationService.isNull(value)) {
            return { isValid: true, errors: [], value: null };
        }
        if (this.undefinedWasEngaged && ValidationService.isUndefined(value)) {
            return { isValid: true, errors: [], value: undefined };
        }
        if (!ValidationService.isObject(value)) {
            return { isValid: false, errors: this.errors, value: value };
        }
        var formattedValue = this.__format(value);
        if (this.stack.length - 1 > 0) {
            var isValid = this.stack.every(function (x) { return x(new Value(formattedValue)); });
            if (!isValid) {
                return { isValid: isValid, errors: this.errors, value: formattedValue };
            }
        }
        for (var _i = 0, _a = Object.entries(this.obj); _i < _a.length; _i++) {
            var _b = _a[_i], k = _b[0], nv = _b[1];
            var _c = nv.validate(formattedValue[k]), isValid = _c.isValid, errors = _c.errors, value_1 = _c.value;
            if (value_1 && isValid) {
                formattedValue[k] = value_1;
            }
            if (!isValid) {
                return {
                    isValid: isValid,
                    errors: errors.concat(this.errors || []),
                    value: formattedValue
                };
            }
        }
        return { isValid: true, errors: [], value: formattedValue };
    };
    Validator.prototype.validateSimple = function (value) {
        var _a, _b;
        var v = new Value(ValidationService.isUndefined(value) ? this._defaultValue : value);
        if (this.undefinedWasEngaged) {
            var isValid = ValidationService.isUndefined(v.value);
            if (isValid) {
                return { isValid: isValid, errors: [], value: v.value };
            }
        }
        if (this.nullEngaged) {
            var isValid = ValidationService.isNull(v.value);
            if (isValid) {
                return { isValid: isValid, errors: [], value: v.value };
            }
        }
        var result = { isValid: true, errors: [], value: v.value };
        for (var _i = 0, _c = this.stack; _i < _c.length; _i++) {
            var cb = _c[_i];
            if (cb instanceof Validator) {
                var _d = cb.validate(v.value), isValid = _d.isValid, errors = _d.errors;
                if (!isValid) {
                    result.isValid = isValid;
                    (_a = result.errors).push.apply(_a, __spreadArrays(this.errors, errors));
                    break;
                }
            }
            else {
                var isValid = cb(v);
                if (!isValid) {
                    result.isValid = isValid;
                    (_b = result.errors).push.apply(_b, v.errors);
                    break;
                }
            }
        }
        result.value = v.value;
        return result;
    };
    Validator.prototype.validate = function (value) {
        switch (this.type) {
            case Schema.types.object:
                return this.validateObj(value);
            default:
                return this.validateSimple(value);
        }
    };
    //   error(errMessage) {
    //     this.errors.push(errMessage);
    //     return this;
    //   }
    Validator.prototype["null"] = function () {
        this.nullEngaged = true;
        return this;
    };
    Validator.prototype.undefined = function () {
        this.undefinedWasEngaged = true;
        return this;
    };
    Validator.prototype.nullish = function () {
        return this["null"]().undefined();
    };
    Validator.prototype.custom = function (cb, customErr) {
        this.append(this._evaluateWithError(function (value) { return cb(value.value); }, customErr));
        return this;
    };
    Validator.prototype["default"] = function (value) {
        this._defaultValue = value;
        if (this.type === "array") {
            if (!Array.isArray(value)) {
                throw new SchemaError("default value should be of type " + this.type);
            }
        }
        else {
            if (typeof this._defaultValue !== this.type) {
                if (ValidationService.isNull(value) && this.nullEngaged) {
                    this.defaultEngaged = true;
                    return;
                }
                if (ValidationService.isUndefined(value) && this.undefinedWasEngaged) {
                    this.defaultEngaged = true;
                    return;
                }
                this._defaultValue = undefined;
                throw new SchemaError("default value should be of type " + this.type);
            }
        }
        this.defaultEngaged = true;
        return this;
    };
    return Validator;
}());
var StringSchemaParser = /** @class */ (function (_super) {
    __extends(StringSchemaParser, _super);
    function StringSchemaParser() {
        var _this = _super.call(this) || this;
        _this.type = Schema.types.string;
        _this._isString();
        _this.errors = [];
        return _this;
    }
    StringSchemaParser.prototype._isString = function () {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) {
            return ValidationService.isString(value.value) ||
                value.value instanceof String;
        }, "value is not a string"));
        return this;
    };
    StringSchemaParser.prototype.trim = function () {
        this.append(function (value) {
            value.set(value.value.trim());
            return true;
        });
        return this;
    };
    StringSchemaParser.prototype.min = function (number, customErr) {
        this.append(this._evaluateWithError(function (value) {
            return value.value.length >= number;
        }, customErr));
        return this;
    };
    StringSchemaParser.prototype.max = function (number, customErr) {
        this.append(this._evaluateWithError(function (value) { return value.value.length <= number; }, customErr));
        return this;
    };
    StringSchemaParser.prototype.noWhiteSpace = function (customErr) {
        this.append(this._evaluateWithError(function (value) { return !value.value.includes(" "); }, customErr));
        return this;
    };
    StringSchemaParser.prototype.startsWith = function (what, customErr) {
        this.append(this._evaluateWithError(function (value) { return value.value.startsWith(what); }, customErr));
        return this;
    };
    StringSchemaParser.prototype.endsWith = function (what, customErr) {
        this.append(this._evaluateWithError(function (value) { return value.value.endsWith(what); }, customErr));
        return this;
    };
    StringSchemaParser.prototype.includes = function (what, customErr) {
        this.append(this._evaluateWithError(function (value) { return value.value.inludes(what); }, customErr));
        return this;
    };
    StringSchemaParser.prototype.uppercase = function () {
        this.append(function (value) {
            value.set(value.value.toUpperCase());
            return true;
        });
        return this;
    };
    StringSchemaParser.prototype.lowercase = function () {
        this.append(function (value) {
            value.set(value.value.toLowerCase());
            return true;
        });
        return this;
    };
    return StringSchemaParser;
}(Validator));
var ObjectSchemaParser = /** @class */ (function (_super) {
    __extends(ObjectSchemaParser, _super);
    function ObjectSchemaParser(obj) {
        var _this = _super.call(this) || this;
        _this.obj = obj;
        _this.type = Schema.types.object;
        _this._isObject();
        _this.errors = [];
        _this._make(obj);
        return _this;
    }
    ObjectSchemaParser.prototype.extend = function (obj) {
        return new ObjectSchemaParser(__assign(__assign({}, this.obj), obj));
    };
    ObjectSchemaParser.prototype._isObject = function () {
        _super.prototype.append.call(this, function (value) { return ValidationService.isObject(value.value); });
        return this;
    };
    ObjectSchemaParser.prototype._make = function (obj) {
        var _this = this;
        if (!ValidationService.isObject(obj)) {
            throw new SchemaError("value is not an object");
        }
        var recurse = function (v) {
            if (!v) {
                return;
            }
            if (v instanceof Validator && !(v instanceof ObjectSchemaParser)) {
                _this.append(v);
                return;
            }
            if (v instanceof ObjectSchemaParser) {
                Object.entries(v.obj).forEach(function (_a) {
                    var key = _a[0], value = _a[1];
                    if (ValidationService.isObject(value)) {
                        Object.values(value).forEach(function (v) {
                            recurse(v);
                        });
                        return;
                    }
                    if (value instanceof ObjectSchemaParser) {
                        Object.values(value.obj).forEach(function (value) {
                            recurse(value);
                        });
                        return;
                    }
                    if (value instanceof Validator) {
                        _this.append(value);
                        return;
                    }
                    else {
                        throw new SchemaError("property " + key + " is not instance of schema parser");
                    }
                });
            }
            else if (ValidationService.isObject(v)) {
                Object.entries(v).forEach(function (_a) {
                    var key = _a[0], value = _a[1];
                    if (ValidationService.isObject(value)) {
                        Object.values(value).forEach(function (v) {
                            recurse(v);
                        });
                        return;
                    }
                    if (value instanceof ObjectSchemaParser) {
                        Object.values(value.obj).forEach(function (value) {
                            recurse(value);
                        });
                        return;
                    }
                    if (value instanceof Validator) {
                        _this.append(value);
                        return;
                    }
                    else {
                        throw new SchemaError("property " + key + " is not instance of schema parser");
                    }
                });
            }
        };
        recurse(obj);
    };
    ObjectSchemaParser.prototype.empty = function (customErr) {
        this.append(this._evaluateWithError(function (v) {
            return ValidationService.isObject(v.value) && !Object.keys(v.value).length;
        }, customErr));
        return this;
    };
    ObjectSchemaParser.prototype.__format = function (v) {
        return Object.keys(this.obj).reduce(function (acc, key) {
            if (key in v) {
                acc[key] = v[key];
            }
            return acc;
        }, Object.entries(this.obj).reduce(function (acc, _a) {
            var key = _a[0], value = _a[1];
            if (value instanceof Validator) {
                if (value.defaultEngaged) {
                    acc[key] = value._defaultValue;
                }
                if (value instanceof ObjectSchemaParser && value) {
                    var newVal = value.__format((v === null || v === void 0 ? void 0 : v[key]) || {});
                    acc[key] = newVal;
                }
                return acc;
            }
        }, {}));
    };
    return ObjectSchemaParser;
}(Validator));
var NumberSchemaParser = /** @class */ (function (_super) {
    __extends(NumberSchemaParser, _super);
    function NumberSchemaParser() {
        var _this = _super.call(this) || this;
        _this.type = Schema.types.number;
        _this._isNumber();
        _this.errors = [];
        return _this;
    }
    NumberSchemaParser.prototype._isNumber = function () {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) {
            return ValidationService.isNumber(value.value) ||
                value.value instanceof BigInt ||
                value.value instanceof Number;
        }, "Value is not a number"));
        return this;
    };
    NumberSchemaParser.prototype.min = function (number, customErr) {
        this.append(this._evaluateWithError(function (value) { return value.value >= number; }), customErr);
        return this;
    };
    NumberSchemaParser.prototype.max = function (number, customErr) {
        this.append(this._evaluateWithError(function (value) { return value.value <= number; }, customErr));
        return this;
    };
    NumberSchemaParser.prototype.positive = function (customErr) {
        this.append(this._evaluateWithError(function (value) { return value.value > 0; }, customErr));
        return this;
    };
    NumberSchemaParser.prototype.negative = function (customErr) {
        this.append(this._evaluateWithError(function (value) { return value.value < 0; }, customErr));
        return this;
    };
    NumberSchemaParser.prototype.int = function () {
        this.append(function (value) {
            value.set(parseInt("" + value.value, 10));
            return true;
        });
        return this;
    };
    NumberSchemaParser.prototype.float = function () {
        this.append(function (value) {
            value.set(parseFloat("" + value.value, 10));
            return true;
        });
        return this;
    };
    NumberSchemaParser.prototype.decimals = function (digits) {
        if (digits === void 0) { digits = 2; }
        this.append(function (value) {
            value.set(parseFloat(parseFloat("" + value.value, 10).toFixed(digits)));
            return true;
        });
        return this;
    };
    return NumberSchemaParser;
}(Validator));
var BooleanSchemaParser = /** @class */ (function (_super) {
    __extends(BooleanSchemaParser, _super);
    function BooleanSchemaParser() {
        var _this = _super.call(this) || this;
        _this.type = Schema.types.boolean;
        _this._isBoolean();
        _this.errors = [];
        return _this;
    }
    BooleanSchemaParser.prototype._isBoolean = function () {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return ValidationService.isBoolean(value.value); }, "value is not boolean"));
        return this;
    };
    return BooleanSchemaParser;
}(Validator));
var NullSchemaParser = /** @class */ (function (_super) {
    __extends(NullSchemaParser, _super);
    function NullSchemaParser() {
        var _this = _super.call(this) || this;
        _this.type = Schema.types["null"];
        _this._isNull();
        _this.errors = [];
        return _this;
    }
    NullSchemaParser.prototype._isNull = function () {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return ValidationService.isNull(value.value); }, "value is not null"));
        return this;
    };
    return NullSchemaParser;
}(Validator));
var UndefinedSchemaParser = /** @class */ (function (_super) {
    __extends(UndefinedSchemaParser, _super);
    function UndefinedSchemaParser() {
        var _this = _super.call(this) || this;
        _this.type = Schema.types.undefined;
        _this._isUndefined();
        _this.errors = [];
        return _this;
    }
    UndefinedSchemaParser.prototype._isUndefined = function () {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return ValidationService.isUndefined(value.value); }, "value is not undefined"));
        return this;
    };
    return UndefinedSchemaParser;
}(Validator));
var DateSchemaParser = /** @class */ (function (_super) {
    __extends(DateSchemaParser, _super);
    function DateSchemaParser() {
        var _this = _super.call(this) || this;
        _this.type = Schema.types.date;
        _this._isDate();
        _this.errors = [];
        return _this;
    }
    DateSchemaParser.prototype._isValidDate = function (date) {
        var v = new Date(date);
        return !isNaN(v.getTime());
    };
    DateSchemaParser.prototype._isDate = function () {
        var _this = this;
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return _this._isValidDate(value.value); }), "value is not a valid date");
        return this;
    };
    DateSchemaParser.prototype.min = function (date, customErr) {
        if (!this._isValidDate(date)) {
            throw new SchemaError("provide a date as minimum");
        }
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return new Date(date) <= new Date(value.value); }, customErr));
        return this;
    };
    DateSchemaParser.prototype.max = function (date, customErr) {
        if (!this._isValidDate(date)) {
            throw new SchemaError("provide a date as maximum");
        }
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return new Date(date) >= new Date(value.value); }, customErr));
        return this;
    };
    DateSchemaParser.prototype.gtNow = function (customErr) {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return new Date() < new Date(value.value); }, customErr));
        return this;
    };
    DateSchemaParser.prototype.gteNow = function (customErr) {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return new Date() <= new Date(value.value); }, customErr));
        return this;
    };
    DateSchemaParser.prototype.ltNow = function (customErr) {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return new Date() > new Date(value.value); }, customErr));
        return this;
    };
    DateSchemaParser.prototype.lteNow = function (customErr) {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return new Date() >= new Date(value.value); }, customErr));
        return this;
    };
    DateSchemaParser.prototype.between = function (dateA, dateB, customErr) {
        return this.min(dateA, customErr).max(dateB, customErr);
    };
    return DateSchemaParser;
}(Validator));
var ArraySchemaParser = /** @class */ (function (_super) {
    __extends(ArraySchemaParser, _super);
    function ArraySchemaParser(value) {
        var _this = _super.call(this) || this;
        _this.type = Schema.types.array;
        _this._isArray();
        _this.errors = [];
        _this._make(value);
        return _this;
    }
    ArraySchemaParser.prototype._isArray = function () {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return Array.isArray(value.value); }, "value is not an array"));
        return this;
    };
    ArraySchemaParser.prototype._make = function (value) {
        if (ValidationService.isNullOrUndefined(value)) {
            return;
        }
        if (value instanceof Validator) {
            this.append(function (x) {
                return (x.value || []).every(function (y, i) {
                    var _a;
                    var _b = value.validate(y), isValid = _b.isValid, formattedValue = _b.value, errors = _b.errors;
                    x.value[i] = formattedValue;
                    (_a = x.errors).push.apply(_a, errors);
                    return isValid;
                });
            });
            return;
        }
        throw new SchemaError("value is not a valid schema type");
    };
    ArraySchemaParser.prototype.empty = function (customErr) {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return !ValidationService.isNotEmptyArray(value.value); }, customErr));
        return this;
    };
    ArraySchemaParser.prototype.nonEmpty = function (customErr) {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return ValidationService.isNotEmptyArray(value.value); }, customErr));
        return this;
    };
    ArraySchemaParser.prototype.ofType = function (type, customErr) {
        if (type === Schema.types.array || !Schema.types[type]) {
            throw new SchemaError("Unsupported type " + type);
        }
        _super.prototype.append.call(this, this._evaluateWithError(function (value) {
            return type === Schema.types.array
                ? value.value.every(function (x) { return Array.isArray(x); })
                : ValidationService.isArrayOfType(value.value, type);
        }), customErr);
        return this;
    };
    ArraySchemaParser.prototype.ofTypes = function (customErr) {
        var types = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            types[_i - 1] = arguments[_i];
        }
        var chain = this;
        for (var _a = 0, types_1 = types; _a < types_1.length; _a++) {
            var type = types_1[_a];
            chain = chain.ofType(type, customErr);
        }
        return chain;
    };
    ArraySchemaParser.prototype.ofInstance = function (cls, customErr) {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return value.value.every(function (x) { return x instanceof cls; }); }, customErr));
        return this;
    };
    ArraySchemaParser.prototype.ofInstances = function (customErr) {
        var clses = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            clses[_i - 1] = arguments[_i];
        }
        var chain = this;
        for (var _a = 0, clses_1 = clses; _a < clses_1.length; _a++) {
            var cls = clses_1[_a];
            chain = chain.ofInstance(cls, customErr);
        }
        return chain;
    };
    ArraySchemaParser.prototype.min = function (number, customErr) {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return value.value.length >= number; }, customErr));
        return this;
    };
    ArraySchemaParser.prototype.max = function (number, customErr) {
        _super.prototype.append.call(this, this._evaluateWithError(function (value) { return value.value.length <= number; }, customErr));
        return this;
    };
    return ArraySchemaParser;
}(Validator));
module.exports = Schema;
