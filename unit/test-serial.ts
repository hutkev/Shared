/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/store.ts' />

module testserial {

  import serial = shared.serial;
  import utils = shared.utils;

  // Simple Ref Handler
  class TestReferenceHandler implements serial.ReferenceHandler {
    valueId(value: any): utils.uid {
      if (value._id === undefined) {
        Object.defineProperty(value, '_id', {
          value: shared.utils.UID()
        });
      } 
      return value._id;
    }
    valueRev(value: any): number {
      if (value._rev === undefined) {
        Object.defineProperty(value, '_rev', {
          value: 0
        });
      } 
      return value._rev;
    }
  }

  function isReference(s: string) : bool {
    return /<[0-9a-fA-F]{24}/.test(s);
  }

  var rh = new TestReferenceHandler();

  export function writeValue(test) {
    test.throws(function () { serial.writeValue(null, null); });
    test.ok(serial.writeValue(rh, null) === 'null');
    test.ok(serial.writeValue(rh, undefined) === 'undefined');
    test.ok(serial.writeValue(rh, 0) === '0');
    test.ok(serial.writeValue(rh, 1) === '1');
    test.ok(serial.writeValue(rh, -1) === '-1');
    test.ok(serial.writeValue(rh, -0) === '0');
    test.ok(serial.writeValue(rh, NaN) === 'NaN');
    test.ok(serial.writeValue(rh, Infinity) === 'Infinity');
    test.ok(serial.writeValue(rh, -Infinity) === '-Infinity');
    test.ok(serial.writeValue(rh, new Number(0)) === '0');
    test.ok(serial.writeValue(rh, new Number(1)) === '1');
    test.ok(serial.writeValue(rh, new Number(-1)) === '-1');
    test.ok(serial.writeValue(rh, new Number(-0)) === '0');
    test.ok(serial.writeValue(rh, new Number(NaN)) === 'NaN');
    test.ok(serial.writeValue(rh, new Number(Infinity)) === 'Infinity');
    test.ok(serial.writeValue(rh, new Number(-Infinity)) === '-Infinity');
    test.ok(serial.writeValue(rh, Number(0)) === '0');
    test.ok(serial.writeValue(rh, Number(1)) === '1');
    test.ok(serial.writeValue(rh, Number(-1)) === '-1');
    test.ok(serial.writeValue(rh, Number(-0)) === '0');
    test.ok(serial.writeValue(rh, Number(NaN)) === 'NaN');
    test.ok(serial.writeValue(rh, Number(Infinity)) === 'Infinity');
    test.ok(serial.writeValue(rh, Number(-Infinity)) === '-Infinity');
    test.ok(serial.writeValue(rh, true) === 'true');
    test.ok(serial.writeValue(rh, false) === 'false');
    test.ok(serial.writeValue(rh, new Boolean(true)) === 'true');
    test.ok(serial.writeValue(rh, new Boolean(false)) === 'false');
    test.ok(serial.writeValue(rh, Boolean(true)) === 'true');
    test.ok(serial.writeValue(rh, Boolean(false)) === 'false');
    test.ok(serial.writeValue(rh, '') === '\"\"');
    test.ok(serial.writeValue(rh, 'a') === '\"a\"');
    test.ok(serial.writeValue(rh, 'abc') === '\"abc\"');
    test.ok(serial.writeValue(rh, 'a\'bc') === '\"a\'bc\"');
    test.ok(serial.writeValue(rh, 'a"bc') === '\"a\\"bc\"');
    test.ok(serial.writeValue(rh, new String('')) === '\"\"');
    test.ok(serial.writeValue(rh, new String('a')) === '\"a\"');
    test.ok(serial.writeValue(rh, new String('abc')) === '\"abc\"');
    test.ok(serial.writeValue(rh, new String('a\'bc')) === '\"a\'bc\"');
    test.ok(serial.writeValue(rh, new String('a"bc')) === '\"a\\"bc\"');
    test.ok(serial.writeValue(rh, String('')) === '\"\"');
    test.ok(serial.writeValue(rh, String('a')) === '\"a\"');
    test.ok(serial.writeValue(rh, String('abc')) === '\"abc\"');
    test.ok(serial.writeValue(rh, String('a\'bc')) === '\"a\'bc\"');
    test.ok(serial.writeValue(rh, String('a"bc')) === '\"a\\"bc\"');
    test.ok(Date.parse(serial.writeValue(rh, new Date(0)))===0);
    test.ok(Date.parse(serial.writeValue(rh, new Date(10000)))===10000);
    test.ok(serial.writeValue(rh, function () { var a = 1; })==='null');
    test.ok(serial.writeValue(rh, writeValue) ==='null');
    test.ok(serial.writeValue(rh, /a/) ==='null');
    test.ok(serial.writeValue(rh, new Error()) ==='null');
    test.ok(isReference(serial.writeValue(rh, {})));
    test.ok(isReference(serial.writeValue(rh, {a:1})));
    test.ok(isReference(serial.writeValue(rh, {a:1,c:2})));
    test.ok(isReference(serial.writeValue(rh, [])));
    test.ok(isReference(serial.writeValue(rh, [1])));
    test.ok(isReference(serial.writeValue(rh, [1,3])));
    var a :any = { a: 1 };
    test.ok(isReference(serial.writeValue(rh,a))===isReference(serial.writeValue(rh,a)));
    var b :any = [ 1 ];
    test.ok(isReference(serial.writeValue(rh,b))===isReference(serial.writeValue(rh,b)));
    test.ok(serial.writeValue(rh,a)!==serial.writeValue(rh,b));
    test.ok(serial.writeValue(rh, null, 'xxx') === 'xxxnull');
    test.ok(serial.writeValue(rh, undefined, 'xxx') === 'xxxundefined');
    test.ok(serial.writeValue(rh, 0, 'xxx') === 'xxx0');
    test.ok(serial.writeValue(rh, 'aaa', 'xxx') === 'xxx\"aaa\"');
    test.ok(serial.writeValue(rh, a, 'xxx') === 'xxx'+'<'+a._id.toString()+'>');
    test.ok(serial.writeValue(rh, b, 'xxx') === 'xxx'+'<'+b._id.toString()+'>');
    test.done();
  };

  export function writeObject(test) {
    test.throws(function () { serial.writeObject(null, null); });
    test.throws(function () { serial.writeObject(null, {}); });
    test.throws(function () { serial.writeObject(rh, null); });
    test.ok(serial.writeObject(rh, {}) === '{}');
    test.ok(serial.writeObject(rh, {a:null}) === '{\"a\":null}');
    test.ok(serial.writeObject(rh, {a:undefined}) === '{\"a\":undefined}');
    test.ok(serial.writeObject(rh, {a:0}) === '{\"a\":0}');
    test.ok(serial.writeObject(rh, {a:1}) === '{\"a\":1}');
    test.ok(serial.writeObject(rh, {a:-1}) === '{\"a\":-1}');
    test.ok(serial.writeObject(rh, {a:-0}) === '{\"a\":0}');
    test.ok(serial.writeObject(rh, {a:NaN}) === '{\"a\":NaN}');
    test.ok(serial.writeObject(rh, {a:Infinity}) === '{\"a\":Infinity}');
    test.ok(serial.writeObject(rh, {a:-Infinity}) === '{\"a\":-Infinity}');
    test.ok(serial.writeObject(rh, {a:true}) === '{\"a\":true}');
    test.ok(serial.writeObject(rh, {a:false}) === '{\"a\":false}');
    test.ok(serial.writeObject(rh, {a:new Boolean(true)}) === '{\"a\":true}');
    test.ok(serial.writeObject(rh, {a:new Boolean(false)}) === '{\"a\":false}');
    test.ok(serial.writeObject(rh, {a:Boolean(true)}) === '{\"a\":true}');
    test.ok(serial.writeObject(rh, {a:Boolean(false)}) === '{\"a\":false}');
    test.ok(serial.writeObject(rh, {a:''}) === '{\"a\":\"\"}');
    test.ok(serial.writeObject(rh, {a:'a'}) === '{\"a\":\"a\"}');
    test.ok(serial.writeObject(rh, {a:'abc'}) === '{\"a\":\"abc\"}');
    test.ok(serial.writeObject(rh, {a:'a\'bc'}) === '{\"a\":\"a\'bc\"}');
    test.ok(serial.writeObject(rh, {a:'a"bc'}) === '{\"a\":\"a\\"bc\"}');
    test.ok(serial.writeObject(rh, {a:new String('')}) === '{\"a\":\"\"}');
    test.ok(serial.writeObject(rh, {a:new String('a')}) === '{\"a\":\"a\"}');
    test.ok(serial.writeObject(rh, {a:new String('abc')}) === '{\"a\":\"abc\"}');
    test.ok(serial.writeObject(rh, {a:new String('a\'bc')}) === '{\"a\":\"a\'bc\"}');
    test.ok(serial.writeObject(rh, {a:new String('a"bc')}) === '{\"a\":\"a\\"bc\"}');
    test.ok(serial.writeObject(rh, {a:String('')}) === '{\"a\":\"\"}');
    test.ok(serial.writeObject(rh, {a:String('a')}) === '{\"a\":\"a\"}');
    test.ok(serial.writeObject(rh, {a:String('abc')}) === '{\"a\":\"abc\"}');
    test.ok(serial.writeObject(rh, {a:String('a\'bc')}) === '{\"a\":\"a\'bc\"}');
    test.ok(serial.writeObject(rh, {a:String('a"bc')}) === '{\"a\":\"a\\"bc\"}');
    test.ok(serial.writeObject(rh, {a:function () { var a = 1; }}) === '{\"a\":null}');
    test.ok(serial.writeObject(rh, {a:writeValue}) === '{\"a\":null}');
    test.ok(serial.writeObject(rh, {a:/a/}) === '{\"a\":null}');
    test.ok(serial.writeObject(rh, {a:new Error()}) === '{\"a\":null}');
    test.ok(serial.writeObject(rh, []) === '[]');
    test.ok(serial.writeObject(rh, [null]) === '[\"0\":null]');
    test.ok(serial.writeObject(rh, [undefined]) === '[\"0\":undefined]');
    test.ok(serial.writeObject(rh, [0]) === '[\"0\":0]');
    test.ok(serial.writeObject(rh, [1]) === '[\"0\":1]');
    test.ok(serial.writeObject(rh, [-1]) === '[\"0\":-1]');
    test.ok(serial.writeObject(rh, [-0]) === '[\"0\":0]');
    test.ok(serial.writeObject(rh, [NaN]) === '[\"0\":NaN]');
    test.ok(serial.writeObject(rh, [Infinity]) === '[\"0\":Infinity]');
    test.ok(serial.writeObject(rh, [-Infinity]) === '[\"0\":-Infinity]');
    test.ok(serial.writeObject(rh, [true]) === '[\"0\":true]');
    test.ok(serial.writeObject(rh, [false]) === '[\"0\":false]');
    test.ok(serial.writeObject(rh, [new Boolean(true)]) === '[\"0\":true]');
    test.ok(serial.writeObject(rh, [new Boolean(false)]) === '[\"0\":false]');
    test.ok(serial.writeObject(rh, [Boolean(true)]) === '[\"0\":true]');
    test.ok(serial.writeObject(rh, [Boolean(false)]) === '[\"0\":false]');
    test.ok(serial.writeObject(rh, ['']) === '[\"0\":\"\"]');
    test.ok(serial.writeObject(rh, ['a']) === '[\"0\":\"a\"]');
    test.ok(serial.writeObject(rh, ['abc']) === '[\"0\":\"abc\"]');
    test.ok(serial.writeObject(rh, ['a\'bc']) === '[\"0\":\"a\'bc\"]');
    test.ok(serial.writeObject(rh, ['a"bc']) === '[\"0\":\"a\\"bc\"]');
    test.ok(serial.writeObject(rh, [new String('')]) === '[\"0\":\"\"]');
    test.ok(serial.writeObject(rh, [new String('a')]) === '[\"0\":\"a\"]');
    test.ok(serial.writeObject(rh, [new String('abc')]) === '[\"0\":\"abc\"]');
    test.ok(serial.writeObject(rh, [new String('a\'bc')]) === '[\"0\":\"a\'bc\"]');
    test.ok(serial.writeObject(rh, [new String('a"bc')]) === '[\"0\":\"a\\"bc\"]');
    test.ok(serial.writeObject(rh, [String('')]) === '[\"0\":\"\"]');
    test.ok(serial.writeObject(rh, [String('a')]) === '[\"0\":\"a\"]');
    test.ok(serial.writeObject(rh, [String('abc')]) === '[\"0\":\"abc\"]');
    test.ok(serial.writeObject(rh, [String('a\'bc')]) === '[\"0\":\"a\'bc\"]');
    test.ok(serial.writeObject(rh, [String('a"bc')]) === '[\"0\":\"a\\"bc\"]');
    test.ok(serial.writeObject(rh, [ function () { var a = 1; } ]) === '[\"0\":null]');
    test.ok(serial.writeObject(rh, [writeValue]) === '[\"0\":null]');
    test.ok(serial.writeObject(rh, [/a/]) === '[\"0\":null]');
    test.ok(serial.writeObject(rh, [new Error()]) === '[\"0\":null]');
    var a :any = { a: 1 };
    var b :any = [ 1, 3 ];
    test.ok(serial.writeObject(rh, { a: a }) == '{\"a\":<'+a._id.toString()+'>}');
    test.ok(serial.writeObject(rh, { a: a, b :a }) == '{\"a\":<'+a._id.toString()+'>,\"b\":<'+a._id.toString()+'>}');
    test.ok(serial.writeObject(rh, { a: b }) == '{\"a\":<'+b._id.toString()+'>}');
    test.ok(serial.writeObject(rh, { a: b, b :b }) == '{\"a\":<'+b._id.toString()+'>,\"b\":<'+b._id.toString()+'>}');
    test.ok(serial.writeObject(rh, [ a ]) == '[\"0\":<'+a._id.toString()+'>]');
    test.ok(serial.writeObject(rh, [ a, a ]) == '[\"0\":<'+a._id.toString()+'>,\"1\":<'+a._id.toString()+'>]');
    test.ok(serial.writeObject(rh, [ b ]) == '[\"0\":<'+b._id.toString()+'>]');
    test.ok(serial.writeObject(rh, [ b, b ]) == '[\"0\":<'+b._id.toString()+'>,\"1\":<'+b._id.toString()+'>]');
    test.ok(utils.isUID(a._id));
    test.ok(utils.isUID(b._id));
    test.done();
  }

  export function writeObjectId(test) {
    var a: any = {}; delete a._id; delete a._rev;
    test.ok(serial.writeObject(rh, a, '', true) === '{' + a._id + ' ' + a._rev + ' }');
    test.ok(serial.writeObject(rh, a, '', true) === '{' + a._id + ' ' + a._rev + ' }');
    var a: any = {a:1}; delete a._id; delete a._rev;
    test.ok(serial.writeObject(rh, a, '', true) === '{' + a._id + ' ' + a._rev + ' "a":1}');
    test.ok(serial.writeObject(rh, a, '', true) === '{' + a._id + ' ' + a._rev + ' "a":1}');
    var a: any = {a:1, b:'x'}; delete a._id; delete a._rev;
    test.ok(serial.writeObject(rh, a, '', true) === '{' + a._id + ' ' + a._rev + ' "a":1,"b":"x"}');
    test.ok(serial.writeObject(rh, a, '', true) === '{' + a._id + ' ' + a._rev + ' "a":1,"b":"x"}');
    var a: any = []; delete a._id; delete a._rev;
    test.ok(serial.writeObject(rh, a, '', true) === '[' + a._id + ' ' + a._rev + ' ]');
    test.ok(serial.writeObject(rh, a, '', true) === '[' + a._id + ' ' + a._rev + ' ]');
    var a: any = [1]; delete a._id; delete a._rev;
    test.ok(serial.writeObject(rh, a, '', true) === '[' + a._id + ' ' + a._rev + ' "0":1]');
    test.ok(serial.writeObject(rh, a, '', true) === '[' + a._id + ' ' + a._rev + ' "0":1]');
    var a: any = [1, 2]; delete a._id; delete a._rev;
    test.ok(serial.writeObject(rh, a, '', true) === '[' + a._id + ' ' + a._rev + ' "0":1,"1":2]');
    test.ok(serial.writeObject(rh, a, '', true) === '[' + a._id + ' ' + a._rev + ' "0":1,"1":2]');
    test.done();
  }

  export function readValue(test) {

    test.throws(function () { serial.readValue(null); });
    test.ok(serial.readValue('null') === null);
    test.ok(serial.readValue('undefined') === undefined);
    test.ok(serial.readValue('0') === 0);
    test.ok(serial.readValue('1') === 1);
    test.ok(serial.readValue('-1') === -1);
    test.ok(serial.readValue('-0') === 0);
    test.ok(isNaN(serial.readValue('NaN')));
    test.ok(serial.readValue('Infinity') === Infinity);
    test.ok(serial.readValue('-Infinity') === -Infinity);
    test.ok(serial.readValue('true') === true);
    test.ok(serial.readValue('false') === false);
    test.ok(serial.readValue('\"\"') === '');
    test.ok(serial.readValue('\"a\"') === 'a');
    test.ok(serial.readValue('\"abc\"') === 'abc');
    test.ok(serial.readValue('\"a\'bc\"') === 'a\'bc');
    test.ok(serial.readValue('\"a\\"bc\"') === 'a"bc');
    var a: any = {}; delete a._id;
    test.ok(utils.isEqual(serial.readValue(serial.writeValue(rh, a)), new serial.Reference(a._id)));
    var a:any = {a:1}; delete a._id;
    test.ok(utils.isEqual(serial.readValue(serial.writeValue(rh, a)), new serial.Reference(a._id)));
    var a:any = {a:1,c:2}; delete a._id;
    test.ok(utils.isEqual(serial.readValue(serial.writeValue(rh, a)), new serial.Reference(a._id)));
    var a:any = []; delete a._id;
    test.ok(utils.isEqual(serial.readValue(serial.writeValue(rh, a)), new serial.Reference(a._id)));
    var a:any = [1]; delete a._id;
    test.ok(utils.isEqual(serial.readValue(serial.writeValue(rh, a)), new serial.Reference(a._id)));
    var a:any = [1,3]; delete a._id;
    test.ok(utils.isEqual(serial.readValue(serial.writeValue(rh, a)), new serial.Reference(a._id)));
    test.throws(function () { serial.readValue('xxxnull') });
    test.ok(serial.readValue('nullxxx') === null);
    test.throws(function () { serial.readValue('xxx0') });
    test.ok(serial.readValue('0xxx') === 0);
    test.ok(serial.readValue('-120.3344e20xxx') === -120.3344e20);
    test.throws(function() { serial.readValue('aaa<123456781234567812345678>'); });
    test.ok(utils.isEqual(serial.readValue('<123456781234567812345678>aaa'), 
      new serial.Reference(utils.makeUID('123456781234567812345678'))));
    test.done();
  };

  export function readObject(test) {
    test.throws(function () { serial.readObject(""); });
    test.throws(function () { serial.readObject("0"); });
    test.throws(function () { serial.readObject("{}",[]); });
    test.throws(function () { serial.readObject("[]", {}); });
    test.ok(utils.isEqual(serial.readObject('{}'), {}));
    test.ok(utils.isEqual(serial.readObject('{"a":1}'), {a:1}));
    test.ok(utils.isEqual(serial.readObject('{"a":1,"b":2}'), {a:1,b:2}));
    test.ok(utils.isEqual(serial.readObject('{ "a" : 1 , "b" : 2 }'), {a:1,b:2}));
    test.ok(utils.isEqual(serial.readObject('[]'), []));
    test.ok(utils.isEqual(serial.readObject('["0":1]'), [1]));
    test.ok(utils.isEqual(serial.readObject('["0":1,"1":2]'), [1,2]));
    test.ok(utils.isEqual(serial.readObject('[ "0" : 1 , "1" : 2 }'), [1,2]));
    test.ok(utils.isEqual(serial.readObject('["2":1]'), [,,1]));
    test.ok(utils.isEqual(serial.readObject('[ "0" : 1 , "2" : 2 }'), [1,,2]));
    test.ok(utils.isEqual(serial.readObject('{}', { a: 1, b:2 }), {a:1,b:2}));
    test.ok(utils.isEqual(serial.readObject('{"a":3}', { a: 1, b:2 }), {a:3,b:2}));
    test.ok(utils.isEqual(serial.readObject('{"b":3}', { a: 1, b:2 }), {b:3}));
    test.ok(utils.isEqual(serial.readObject('{"c":3}', { a: 1, b:2 }), {c:3}));
    test.ok(utils.isEqual(serial.readObject('[]', [1,2]), []));
    test.ok(utils.isEqual(serial.readObject('["0":3]', [1,2]), [3]));
    test.ok(utils.isEqual(serial.readObject('["1":3]', [1,2]), [,3]));
    test.ok(utils.isEqual(serial.readObject('["2":3]', [1,2]), [,,3]));
    test.done();
  }

  export function scaleNumber(test) {
    var num = 1;
    while (true) {
      var out = serial.writeValue(rh, num);
      var val = serial.readValue(out);
      test.ok(num === val);
      num = num * 10;
      if (num === Infinity)
        break;
    }
    test.done();
  }
  
} // testserial