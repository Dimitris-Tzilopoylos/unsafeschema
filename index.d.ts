export = Schema;
declare class Schema {
  static types: {
    array: string;
    object: string;
    string: string;
    number: string;
    null: string;
    undefined: string;
    boolean: string;
    date: string;
  };
  static object(value?: any): ObjectSchemaParser;
  static array(value?: any[] | null): ArraySchemaParser;
  static string(): StringSchemaParser;
  static number(): NumberSchemaParser;
  static boolean(): BooleanSchemaParser;
  static null(): NullSchemaParser;
  static undefined(): UndefinedSchemaParser;
  static date(): DateSchemaParser;
}
declare class ObjectSchemaParser extends Validator {
  constructor(obj?: any);
  obj: any;
  type: string;
  extend(obj: any): ObjectSchemaParser;
  _isObject(): ObjectSchemaParser;
  _make(obj: any): void;
  empty(customErr?: any): ObjectSchemaParser;
  __format(v: any): any;
}
declare class ArraySchemaParser extends Validator {
  constructor(
    value?:
      | ArraySchemaParser
      | StringSchemaParser
      | NumberSchemaParser
      | BooleanSchemaParser
      | DateSchemaParser
      | ObjectSchemaParser
      | NullSchemaParser
      | UndefinedSchemaParser
      | null
      | undefined
  );
  type: string;
  _isArray(): ArraySchemaParser;
  _make(value: any): void;
  empty(customErr?: any): ArraySchemaParser;
  nonEmpty(customErr?: any): ArraySchemaParser;
  ofType(type: any, customErr?: any): ArraySchemaParser;
  ofTypes(customErr?: any, ...types: any[]): ArraySchemaParser;
  ofInstance(cls: any, customErr?: any): ArraySchemaParser;
  ofInstances(customErr?: any, ...clses: any[]): ArraySchemaParser;
  min(number: any, customErr?: any): ArraySchemaParser;
  max(number: any, customErr?: any): ArraySchemaParser;
}
declare class StringSchemaParser extends Validator {
  type: string;
  _isString(): StringSchemaParser;
  email(customErr?: any): StringSchemaParser;
  trim(): StringSchemaParser;
  min(number: any, customErr?: any): StringSchemaParser;
  max(number: any, customErr?: any): StringSchemaParser;
  noWhiteSpace(customErr?: any): StringSchemaParser;
  startsWith(what: any, customErr?: any): StringSchemaParser;
  endsWith(what: any, customErr?: any): StringSchemaParser;
  includes(what: any, customErr?: any): StringSchemaParser;
  uppercase(): StringSchemaParser;
  lowercase(): StringSchemaParser;
}
declare class NumberSchemaParser extends Validator {
  type: string;
  _isNumber(): NumberSchemaParser;
  min(number: any, customErr?: any): NumberSchemaParser;
  max(number: any, customErr?: any): NumberSchemaParser;
  positive(customErr?: any): NumberSchemaParser;
  negative(customErr?: any): NumberSchemaParser;
  int(): NumberSchemaParser;
  float(): NumberSchemaParser;
  decimals(digits?: number): NumberSchemaParser;
}
declare class BooleanSchemaParser extends Validator {
  type: string;
  _isBoolean(): BooleanSchemaParser;
}
declare class NullSchemaParser extends Validator {
  type: string;
  _isNull(): NullSchemaParser;
}
declare class UndefinedSchemaParser extends Validator {
  type: string;
  _isUndefined(): UndefinedSchemaParser;
}
declare class DateSchemaParser extends Validator {
  type: string;
  _isValidDate(date: any): boolean;
  _isDate(): DateSchemaParser;
  min(date: any, customErr?: any): DateSchemaParser;
  max(date: any, customErr?: any): DateSchemaParser;
  gtNow(customErr?: any): DateSchemaParser;
  gteNow(customErr?: any): DateSchemaParser;
  ltNow(customErr?: any): DateSchemaParser;
  lteNow(customErr?: any): DateSchemaParser;
  between(dateA: any, dateB: any, customErr?: any): DateSchemaParser;
}
declare class Validator {
  value: any;
  stack: any[];
  errors: any[];
  nullEngaged: boolean;
  undefinedWasEngaged: boolean;
  defaultEngaged: boolean;
  _defaultValue: any;
  _evaluateWithError(cb: any, err?: any): (value: any) => any;
  append(cb: any): void;
  validateObj(value: any): {
    isValid: any;
    errors: any;
    value: any;
  };
  validateSimple(value?: any): {
    isValid: boolean;
    errors: any[];
    value: any;
  };
  validate(value?: any): {
    isValid: any;
    errors: any;
    value: any;
  };
  null(): Validator;
  undefined(): Validator;
  nullish(): Validator;
  custom(cb: any, customErr?: any): Validator;
  default(value: any): Validator;
}
