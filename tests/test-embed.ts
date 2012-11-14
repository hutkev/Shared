/// <reference path='../defs/node-0.8.d.ts' />

import shared = module('../lib/shared');

exports.call = function(test) {
  if (test !== undefined) test.done();
  return shared.Store.prototype.root();
};
