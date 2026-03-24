#!/usr/bin/env node
// Enable OpenSSL legacy provider before loading anything else
process.env.NODE_OPTIONS = '--openssl-legacy-provider';

// Force OpenSSL legacy provider at crypto level
const crypto = require('crypto');
crypto.createSecureContext = (function(original) {
  return function(...args) {
    process.env.OPENSSL_CONF = '/dev/null';
    return original(...args);
  };
})(crypto.createSecureContext);

// Now load and run Next.js
require('next/dist/bin/next').nextcli(['dev']);
