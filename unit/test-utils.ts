/// <reference path='../defs/node-0.8.d.ts' />
/// <reference path='../lib/store.ts' />

module testutils {

  import utils = shared.utils;

  class StringWritable implements shared.utils.Writeable {

    private _lines: string[];

    constructor () {
      this._lines = [];
    }

    write(str: string) {
      this._lines.push(str);
    }

    lines(): number {
      return this._lines.length;
    }

    line(at: number): string {
      return this._lines[at];
    }
  }

  var dateStr = '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' +
    '[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z $';
  var datePat = new RegExp(dateStr);

  export function clog_empty(test) {
    var to = new StringWritable();
    var clog = new utils.Logger(to, "test", utils.LogLevel.INFO, ['foo']);
    test.ok(to.lines() === 0);
    test.done();
  };

  export function clog_debug_one_subject(test) {
    var to = new StringWritable();
    var clog = new utils.Logger(to, "test", utils.LogLevel.INFO, ['foo']);
    clog.debug('foo', 'Hello %s', 'foo');
    clog.debug('bar', 'Hello %s', 'bar');
    clog.info('Hello %s', 'bar');

    test.ok(to.lines() === 2);
    var line = to.line(0);
    test.ok(datePat.test(line.substr(0, 25)));
    test.ok(utils.isEqual(line.substr(25), 'test INFO foo: Hello foo\n'));
    var line = to.line(1);
    test.ok(datePat.test(line.substr(0, 25)));
    test.ok(utils.isEqual(line.substr(25), 'test INFO Hello bar\n'));

    test.done();
  };

  export function clog_debug_two_subject(test) {
    var to = new StringWritable();
    var clog = new utils.Logger(to, "test", utils.LogLevel.INFO, ['foo', 'bar']);
    clog.debug('foo', 'Hello %s', 'foo');
    clog.debug('bar', 'Hello %s', 'bar');
    clog.debug('bob', 'Hello %s', 'bob');

    test.ok(to.lines() === 2);
    var line = to.line(0);
    test.ok(datePat.test(line.substr(0, 25)));
    test.ok(utils.isEqual(line.substr(25), 'test INFO foo: Hello foo\n'));
    var line = to.line(1);
    test.ok(datePat.test(line.substr(0, 25)));
    test.ok(utils.isEqual(line.substr(25), 'test INFO bar: Hello bar\n'));
    test.done();
  };

  export function clog_no_debug(test) {
    var to = new StringWritable();
    var clog = new utils.Logger(to, "test", utils.LogLevel.WARN, ['foo', 'bar']);
    clog.debug('foo', 'Hello %s', 'foo');
    clog.debug('bar', 'Hello %s', 'bar');
    clog.debug('bob', 'Hello %s', 'bob');
    clog.info('Hello %s', 'bob');

    test.ok(to.lines() === 0);
    test.done();
  };

  export function clog_warn(test) {
    var to = new StringWritable();
    var clog = new utils.Logger(to, "test", utils.LogLevel.WARN, []);
    clog.warn('Hello %s', 'foo');
    clog.warn('Hello %s', 'bar');

    test.ok(to.lines() === 2);
    var line = to.line(0);
    test.ok(datePat.test(line.substr(0, 25)));
    test.ok(utils.isEqual(line.substr(25), 'test WARNING Hello foo\n'));
    var line = to.line(1);
    test.ok(datePat.test(line.substr(0, 25)));
    test.ok(utils.isEqual(line.substr(25), 'test WARNING Hello bar\n'));
    test.done();
  };

  export function clog_fatal(test) {
    var to = new StringWritable();
    var clog = new utils.Logger(to, "test", utils.LogLevel.INFO, []);

    test.throws(function () { clog.fatal('Hello %s', 'bob'); }, Error);

    test.ok(to.lines() === 1);
    var line = to.line(0);
    test.ok(datePat.test(line.substr(0, 25)));
    test.ok(utils.isEqual(line.substr(25), 'test FATAL Hello bob\n'));
    test.done();
  };

  export function hashString(test) {
    test.throws(function () { utils.hash(null); });
    test.throws(function () { utils.hash(undefined); });
    test.ok(utils.hash('') === 5381);
    test.ok(utils.hash('', null) === 5381);
    test.ok(utils.hash('', undefined) === 5381);
    test.ok(utils.hash('', 0) === 0);
    test.ok(utils.hash('', 1) == 1);
    test.ok(utils.hash('a', 0) == 97);
    test.ok(utils.hash('aa', 0) == 3104);
    test.ok(utils.hash('ab', 0) == 3105);
    test.ok(utils.hash('a') == 166908);
    test.ok(utils.hash('aa') == 5174245);
    test.ok(utils.hash('ab') == 5174246);
    test.done();
  };

  export function isvalue(test) {
    test.ok(!utils.isValue(null));
    test.ok(!utils.isValue(undefined));
    test.ok(utils.isValue(0));
    test.ok(utils.isValue(1));
    test.ok(utils.isValue(''));
    test.ok(utils.isValue('a'));
    test.ok(utils.isValue(true));
    test.ok(utils.isValue(false));
    test.ok(utils.isValue([]));
    test.ok(utils.isValue([1]));
    test.ok(utils.isValue({}));
    test.ok(utils.isValue({ a: 1 }));
    test.done();
  }

  export function isobject(test) {
    test.ok(!utils.isObject(null));
    test.ok(!utils.isObject(undefined));
    test.ok(!utils.isObject(0));
    test.ok(!utils.isObject(1));
    test.ok(!utils.isObject(''));
    test.ok(!utils.isObject('a'));
    test.ok(!utils.isObject(true));
    test.ok(!utils.isObject(false));
    test.ok(!utils.isObject([]));
    test.ok(!utils.isObject([1]));
    test.ok(utils.isObject({}));
    test.ok(utils.isObject({ a: 1 }));
    test.done();
  }

  export function typetest(test) {
    test.ok(utils.typeOf(null) === 'null');
    test.ok(utils.typeOf(undefined) === 'undefined');
    test.ok(utils.typeOf(0) === 'number');
    test.ok(utils.typeOf(1) === 'number');
    test.ok(utils.typeOf('') === 'string');
    test.ok(utils.typeOf('a') === 'string');
    test.ok(utils.typeOf(true) === 'boolean');
    test.ok(utils.typeOf(false) === 'boolean');
    test.ok(utils.typeOf([]) === 'array');
    test.ok(utils.typeOf([1]) === 'array');
    test.ok(utils.typeOf({}) === 'object');
    test.ok(utils.typeOf({ a: 1 }) === 'object');
    test.done();
  }

  export function unique(test) {
    var u = new utils.UniqueObject();
    test.ok(utils.isValue(u.id()));
    test.ok(u.id() == u.id());
    test.ok(utils.isUID(u.id()));
    test.ok(!utils.isUID(null));
    test.ok(!utils.isUID(''));
    test.ok(!utils.isUID('a'));
    test.ok(utils.isUID(utils.makeUID('123456781234567812345678')));
    test.throws(function () { utils.isUID(utils.makeUID('23456781234567812345678')) });
    test.throws(function () { utils.isUID(utils.makeUID('1123456781234567812345678')) });
    test.ok(utils.isUID(utils.makeUID('ABCDEF78ABCDEF78ABCDEF78')));
    test.throws(function () { utils.isUID(utils.makeUID('ABCDEFG7ABCDEFG7ABCDEFG7')) });
    var u2 = new utils.UniqueObject();
    test.ok(u2.id() === u2.id());
    test.ok(utils.isUID(u2.id()));
    test.ok(u2 !== u);
    var u3 = new utils.UniqueObject();
    test.ok(u3.id() === u3.id());
    test.ok(utils.isUID(u3.id()));
    test.ok(u3 !== u);
    test.ok(u3 !== u2);
    test.done();
  }

  export function stringmap(test) {
    var m = new utils.Map(utils.hash);
    test.ok(m.insert('a', 'foo') === true);
    test.ok(m.insert('b', 'bar') === true);
    test.ok(m.insert('b', 'bar') === false);
    test.ok(m.find('a') === 'foo');
    test.ok(m.find('b') === 'bar');
    test.ok(m.find('c') === null);
    test.ok(m.remove('a') === true);
    test.ok(m.find('a') === null);
    test.ok(m.remove('a') === false);
    test.ok(m.find('a') === null);
    test.ok(m.find('b') === 'bar');
    test.ok(m.find('c') === null);
    test.throws(function () { m.insert('c', null) }, Error);
    test.ok(m.insert('b', 'new') === false);
    test.ok(m.find('b') === 'bar');
    test.done();
  }

  export function stringset(test) {
    var s = new utils.StringSet(['a', 'b']);
    test.throws(function () { s.put(null); }, Error);
    test.throws(function () { s.remove(null); }, Error);
    test.throws(function () { s.id(null); }, Error);
    test.throws(function () { s.has(null); }, Error);
    test.ok(s.has('a') === true);
    test.ok(s.has('b') === true);
    test.ok(s.has('c') === false);
    test.ok(s.id('a') === 0);
    test.ok(s.id('b') === 1);
    test.ok(s.id('c') === null);
    test.ok(s.id('a') !== s.id('b'));
    test.ok(s.remove('a') === true);
    test.ok(s.remove('a') === false);
    test.ok(s.remove('c') === false);
    test.throws(function () { s.put(null); }, Error);
    test.throws(function () { s.remove(null); }, Error);
    test.ok(s.put('a') === true);
    test.ok(s.put('a') === false);
    test.ok(s.id('a') === 2);
    test.ok(s.id('b') === 1);
    test.ok(s.id('c') === null);
    test.done();
  }

  export function mapapply(test) {
    test.expect(5);

    var m = new utils.Map(utils.hash);
    m.apply(function (key, value) {
      test.ok(false);
      return true;
    });

    test.ok(m.insert('a', 'foo') === true);
    m.apply(function (key, value) {
      test.ok(key=='a' && value =='foo');
      return true;
    });

    test.ok(m.insert('b', 'bar') === true);
    m.apply(function (key, value) {
      test.ok((key=='a' && value =='foo') ||
        (key =='b' && value =='bar'));
      return true;
    });
    test.done();
  }
}