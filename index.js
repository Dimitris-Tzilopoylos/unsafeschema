const ValidationService = require("easy-validation-service");
const { SchemaError } = require("./error");

class Value {
  constructor(value) {
    this.value = value;
    this.errors = [];
  }

  set(value) {
    this.value = value;
  }

  setErrors(...errors) {
    this.errors = errors || [];
  }
}

class Schema {
  static types = {
    array: "array",
    object: "object",
    string: "string",
    number: "number",
    null: "null",
    undefined: "undefined",
    boolean: "boolean",
    date: "date",
  };

  static object(value = {}) {
    if (!ValidationService.isObject(value)) {
      throw new SchemaError("value is not an object");
    }

    return new ObjectSchemaParser(value);
  }

  static array(value) {
    return new ArraySchemaParser(value);
  }

  static string() {
    return new StringSchemaParser();
  }

  static number() {
    return new NumberSchemaParser();
  }

  static boolean() {
    return new BooleanSchemaParser();
  }

  static null() {
    return new NullSchemaParser();
  }

  static undefined() {
    return new UndefinedSchemaParser();
  }

  static date() {
    return new DateSchemaParser();
  }
}

class Validator {
  constructor() {
    this.value = undefined;
    this.stack = [];
    this.errors = [];
    this.nullEngaged = false;
    this.undefinedWasEngaged = false;
    this.defaultEngaged = false;
    this._defaultValue = undefined;
  }

  _evaluateWithError(cb, err) {
    return (value) => {
      const result = cb(value);

      if (!result && err) {
        value.errors.push(err);
      }

      return result;
    };
  }
  append(cb) {
    this.stack.push(cb);
  }

  validateObj(value) {
    if (this.nullEngaged && ValidationService.isNull(value)) {
      return { isValid: true, errors: [], value: null };
    }
    if (this.undefinedWasEngaged && ValidationService.isUndefined(value)) {
      return { isValid: true, errors: [], value: undefined };
    }

    if (!ValidationService.isObject(value)) {
      return { isValid: false, errors: this.errors, value: value };
    }

    const formattedValue = this.__format(value);

    if (this.stack.length - 1 > 0) {
      const isValid = this.stack.every((x) => x(new Value(formattedValue)));
      if (!isValid) {
        return { isValid, errors: this.errors, value: formattedValue };
      }
    }

    for (const [k, nv] of Object.entries(this.obj)) {
      const { isValid, errors, value } = nv.validate(formattedValue[k]);
      if (value && isValid) {
        formattedValue[k] = value;
      }
      if (!isValid) {
        return {
          isValid,
          errors: errors.concat(this.errors || []),
          value: formattedValue,
        };
      }
    }

    return { isValid: true, errors: [], value: formattedValue };
  }

  validateSimple(value) {
    const v = new Value(
      ValidationService.isUndefined(value) ? this._defaultValue : value
    );
    if (this.undefinedWasEngaged) {
      const isValid = ValidationService.isUndefined(v.value);
      if (isValid) {
        return { isValid, errors: [], value: v.value };
      }
    }
    if (this.nullEngaged) {
      const isValid = ValidationService.isNull(v.value);
      if (isValid) {
        return { isValid, errors: [], value: v.value };
      }
    }
    const result = { isValid: true, errors: [], value: v.value };

    for (let cb of this.stack) {
      if (cb instanceof Validator) {
        const { isValid, errors } = cb.validate(v.value);
        if (!isValid) {
          result.isValid = isValid;
          result.errors.push(...this.errors, ...errors);
          break;
        }
      } else {
        const isValid = cb(v);

        if (!isValid) {
          result.isValid = isValid;
          result.errors.push(...v.errors);
          break;
        }
      }
    }
    result.value = v.value;

    return result;
  }

  validate(value) {
    switch (this.type) {
      case Schema.types.object:
        return this.validateObj(value);
      default:
        return this.validateSimple(value);
    }
  }

  //   error(errMessage) {
  //     this.errors.push(errMessage);
  //     return this;
  //   }

  null() {
    this.nullEngaged = true;
    return this;
  }

  undefined() {
    this.undefinedWasEngaged = true;
    return this;
  }

  nullish() {
    return this.null().undefined();
  }

  custom(cb, customErr) {
    this.append(this._evaluateWithError((value) => cb(value.value), customErr));
    return this;
  }

  default(value) {
    this._defaultValue = value;
    if (this.type === "array") {
      if (!Array.isArray(value)) {
        throw new SchemaError(`default value should be of type ${this.type}`);
      }
    } else {
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
        throw new SchemaError(`default value should be of type ${this.type}`);
      }
    }

    this.defaultEngaged = true;
    return this;
  }
}

class StringSchemaParser extends Validator {
  constructor() {
    super();
    this.type = Schema.types.string;
    this._isString();
    this.errors = [];
  }

  _isString() {
    super.append(
      this._evaluateWithError(
        (value) =>
          ValidationService.isString(value.value) ||
          value.value instanceof String,
        "value is not a string"
      )
    );
    return this;
  }

  email(customErr) {
    this.append(
      this._evaluateWithError(
        (value) => ValidationService.validateEmail(value.value),
        customErr
      )
    );
    return this;
  }

  trim() {
    this.append((value) => {
      value.set(value.value.trim());
      return true;
    });
    return this;
  }

  min(number, customErr) {
    this.append(
      this._evaluateWithError((value) => {
        return value.value.length >= number;
      }, customErr)
    );
    return this;
  }

  max(number, customErr) {
    this.append(
      this._evaluateWithError(
        (value) => value.value.length <= number,
        customErr
      )
    );
    return this;
  }

  noWhiteSpace(customErr) {
    this.append(
      this._evaluateWithError((value) => !value.value.includes(" "), customErr)
    );
    return this;
  }

  startsWith(what, customErr) {
    this.append(
      this._evaluateWithError(
        (value) => value.value.startsWith(what),
        customErr
      )
    );
    return this;
  }

  endsWith(what, customErr) {
    this.append(
      this._evaluateWithError((value) => value.value.endsWith(what), customErr)
    );
    return this;
  }

  includes(what, customErr) {
    this.append(
      this._evaluateWithError((value) => value.value.inludes(what), customErr)
    );
    return this;
  }

  uppercase() {
    this.append((value) => {
      value.set(value.value.toUpperCase());
      return true;
    });
    return this;
  }

  lowercase() {
    this.append((value) => {
      value.set(value.value.toLowerCase());
      return true;
    });
    return this;
  }
}

class ObjectSchemaParser extends Validator {
  constructor(obj) {
    super();
    this.obj = obj;
    this.type = Schema.types.object;
    this._isObject();
    this.errors = [];
    this._make(obj);
  }

  extend(obj) {
    return new ObjectSchemaParser({ ...this.obj, ...obj });
  }

  _isObject() {
    super.append((value) => ValidationService.isObject(value.value));
    return this;
  }

  _make(obj) {
    if (!ValidationService.isObject(obj)) {
      throw new SchemaError("value is not an object");
    }
    const recurse = (v) => {
      if (!v) {
        return;
      }
      if (v instanceof Validator && !(v instanceof ObjectSchemaParser)) {
        this.append(v);
        return;
      }

      if (v instanceof ObjectSchemaParser) {
        Object.entries(v.obj).forEach(([key, value]) => {
          if (ValidationService.isObject(value)) {
            Object.values(value).forEach((v) => {
              recurse(v);
            });
            return;
          }
          if (value instanceof ObjectSchemaParser) {
            Object.values(value.obj).forEach((value) => {
              recurse(value);
            });
            return;
          }
          if (value instanceof Validator) {
            this.append(value);
            return;
          } else {
            throw new SchemaError(
              `property ${key} is not instance of schema parser`
            );
          }
        });
      } else if (ValidationService.isObject(v)) {
        Object.entries(v).forEach(([key, value]) => {
          if (ValidationService.isObject(value)) {
            Object.values(value).forEach((v) => {
              recurse(v);
            });
            return;
          }
          if (value instanceof ObjectSchemaParser) {
            Object.values(value.obj).forEach((value) => {
              recurse(value);
            });
            return;
          }
          if (value instanceof Validator) {
            this.append(value);
            return;
          } else {
            throw new SchemaError(
              `property ${key} is not instance of schema parser`
            );
          }
        });
      }
    };

    recurse(obj);
  }

  empty(customErr) {
    this.append(
      this._evaluateWithError(
        (v) =>
          ValidationService.isObject(v.value) && !Object.keys(v.value).length,
        customErr
      )
    );

    return this;
  }

  __format(v) {
    return Object.keys(this.obj).reduce(
      (acc, key) => {
        if (key in v) {
          acc[key] = v[key];
        }
        return acc;
      },
      Object.entries(this.obj).reduce((acc, [key, value]) => {
        if (value instanceof Validator) {
          if (value.defaultEngaged) {
            acc[key] = value._defaultValue;
          }

          if (value instanceof ObjectSchemaParser && value) {
            const newVal = value.__format(v?.[key] || {});

            acc[key] = newVal;
          }
          return acc;
        }
      }, {})
    );
  }
}

class NumberSchemaParser extends Validator {
  constructor() {
    super();
    this.type = Schema.types.number;
    this._isNumber();
    this.errors = [];
  }

  _isNumber() {
    super.append(
      this._evaluateWithError(
        (value) =>
          ValidationService.isNumber(value.value) ||
          value.value instanceof BigInt ||
          value.value instanceof Number,
        "Value is not a number"
      )
    );
    return this;
  }

  min(number, customErr) {
    this.append(
      this._evaluateWithError((value) => value.value >= number),
      customErr
    );
    return this;
  }

  max(number, customErr) {
    this.append(
      this._evaluateWithError((value) => value.value <= number, customErr)
    );
    return this;
  }

  positive(customErr) {
    this.append(this._evaluateWithError((value) => value.value > 0, customErr));
    return this;
  }

  negative(customErr) {
    this.append(this._evaluateWithError((value) => value.value < 0, customErr));
    return this;
  }

  int() {
    this.append((value) => {
      value.set(parseInt(`${value.value}`, 10));
      return true;
    });
    return this;
  }

  float() {
    this.append((value) => {
      value.set(parseFloat(`${value.value}`, 10));
      return true;
    });
    return this;
  }

  decimals(digits = 2) {
    this.append((value) => {
      value.set(parseFloat(parseFloat(`${value.value}`, 10).toFixed(digits)));
      return true;
    });
    return this;
  }
}

class BooleanSchemaParser extends Validator {
  constructor() {
    super();
    this.type = Schema.types.boolean;
    this._isBoolean();
    this.errors = [];
  }

  _isBoolean() {
    super.append(
      this._evaluateWithError(
        (value) => ValidationService.isBoolean(value.value),
        "value is not boolean"
      )
    );
    return this;
  }
}

class NullSchemaParser extends Validator {
  constructor() {
    super();
    this.type = Schema.types.null;
    this._isNull();
    this.errors = [];
  }

  _isNull() {
    super.append(
      this._evaluateWithError(
        (value) => ValidationService.isNull(value.value),
        "value is not null"
      )
    );
    return this;
  }
}

class UndefinedSchemaParser extends Validator {
  constructor() {
    super();
    this.type = Schema.types.undefined;
    this._isUndefined();
    this.errors = [];
  }

  _isUndefined() {
    super.append(
      this._evaluateWithError(
        (value) => ValidationService.isUndefined(value.value),
        "value is not undefined"
      )
    );
    return this;
  }
}

class DateSchemaParser extends Validator {
  constructor() {
    super();
    this.type = Schema.types.date;
    this._isDate();
    this.errors = [];
  }

  _isValidDate(date) {
    const v = new Date(date);
    return !isNaN(v.getTime());
  }

  _isDate() {
    super.append(
      this._evaluateWithError((value) => this._isValidDate(value.value)),
      "value is not a valid date"
    );
    return this;
  }

  min(date, customErr) {
    if (!this._isValidDate(date)) {
      throw new SchemaError(`provide a date as minimum`);
    }
    super.append(
      this._evaluateWithError(
        (value) => new Date(date) <= new Date(value.value),
        customErr
      )
    );
    return this;
  }

  max(date, customErr) {
    if (!this._isValidDate(date)) {
      throw new SchemaError(`provide a date as maximum`);
    }
    super.append(
      this._evaluateWithError(
        (value) => new Date(date) >= new Date(value.value),
        customErr
      )
    );
    return this;
  }

  gtNow(customErr) {
    super.append(
      this._evaluateWithError(
        (value) => new Date() < new Date(value.value),
        customErr
      )
    );
    return this;
  }
  gteNow(customErr) {
    super.append(
      this._evaluateWithError(
        (value) => new Date() <= new Date(value.value),
        customErr
      )
    );
    return this;
  }

  ltNow(customErr) {
    super.append(
      this._evaluateWithError(
        (value) => new Date() > new Date(value.value),
        customErr
      )
    );
    return this;
  }
  lteNow(customErr) {
    super.append(
      this._evaluateWithError(
        (value) => new Date() >= new Date(value.value),
        customErr
      )
    );
    return this;
  }

  between(dateA, dateB, customErr) {
    return this.min(dateA, customErr).max(dateB, customErr);
  }
}

class ArraySchemaParser extends Validator {
  constructor(value) {
    super();
    this.type = Schema.types.array;
    this._isArray();
    this.errors = [];
    this._make(value);
  }

  _isArray() {
    super.append(
      this._evaluateWithError(
        (value) => Array.isArray(value.value),
        "value is not an array"
      )
    );
    return this;
  }

  _make(value) {
    if (ValidationService.isNullOrUndefined(value)) {
      return;
    }

    if (value instanceof Validator) {
      this.append((x) =>
        (x.value || []).every((y, i) => {
          const { isValid, value: formattedValue, errors } = value.validate(y);
          x.value[i] = formattedValue;
          x.errors.push(...errors);
          return isValid;
        })
      );
      return;
    }

    throw new SchemaError(`value is not a valid schema type`);
  }

  empty(customErr) {
    super.append(
      this._evaluateWithError(
        (value) => !ValidationService.isNotEmptyArray(value.value),
        customErr
      )
    );
    return this;
  }

  nonEmpty(customErr) {
    super.append(
      this._evaluateWithError(
        (value) => ValidationService.isNotEmptyArray(value.value),
        customErr
      )
    );
    return this;
  }

  ofType(type, customErr) {
    if (type === Schema.types.array || !Schema.types[type]) {
      throw new SchemaError(`Unsupported type ${type}`);
    }
    super.append(
      this._evaluateWithError((value) =>
        type === Schema.types.array
          ? value.value.every((x) => Array.isArray(x))
          : ValidationService.isArrayOfType(value.value, type)
      ),
      customErr
    );
    return this;
  }

  ofTypes(customErr, ...types) {
    let chain = this;
    for (const type of types) {
      chain = chain.ofType(type, customErr);
    }
    return chain;
  }

  ofInstance(cls, customErr) {
    super.append(
      this._evaluateWithError(
        (value) => value.value.every((x) => x instanceof cls),
        customErr
      )
    );
    return this;
  }

  ofInstances(customErr, ...clses) {
    let chain = this;
    for (const cls of clses) {
      chain = chain.ofInstance(cls, customErr);
    }
    return chain;
  }

  min(number, customErr) {
    super.append(
      this._evaluateWithError(
        (value) => value.value.length >= number,
        customErr
      )
    );
    return this;
  }

  max(number, customErr) {
    super.append(
      this._evaluateWithError(
        (value) => value.value.length <= number,
        customErr
      )
    );
    return this;
  }
}

module.exports = Schema;
