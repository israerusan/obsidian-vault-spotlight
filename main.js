/* Vault Spotlight */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// (disabled):crypto
var require_crypto = __commonJS({
  "(disabled):crypto"() {
  }
});

// node_modules/tweetnacl/nacl-fast.js
var require_nacl_fast = __commonJS({
  "node_modules/tweetnacl/nacl-fast.js"(exports, module2) {
    (function(nacl2) {
      "use strict";
      var gf = function(init) {
        var i, r = new Float64Array(16);
        if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
        return r;
      };
      var randombytes = function() {
        throw new Error("no PRNG");
      };
      var _0 = new Uint8Array(16);
      var _9 = new Uint8Array(32);
      _9[0] = 9;
      var gf0 = gf(), gf1 = gf([1]), _121665 = gf([56129, 1]), D = gf([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]), D2 = gf([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]), X = gf([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]), Y = gf([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]), I = gf([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
      function ts64(x, i, h, l) {
        x[i] = h >> 24 & 255;
        x[i + 1] = h >> 16 & 255;
        x[i + 2] = h >> 8 & 255;
        x[i + 3] = h & 255;
        x[i + 4] = l >> 24 & 255;
        x[i + 5] = l >> 16 & 255;
        x[i + 6] = l >> 8 & 255;
        x[i + 7] = l & 255;
      }
      function vn(x, xi, y, yi, n) {
        var i, d = 0;
        for (i = 0; i < n; i++) d |= x[xi + i] ^ y[yi + i];
        return (1 & d - 1 >>> 8) - 1;
      }
      function crypto_verify_16(x, xi, y, yi) {
        return vn(x, xi, y, yi, 16);
      }
      function crypto_verify_32(x, xi, y, yi) {
        return vn(x, xi, y, yi, 32);
      }
      function core_salsa20(o, p, k, c) {
        var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
        for (var i = 0; i < 20; i += 2) {
          u = x0 + x12 | 0;
          x4 ^= u << 7 | u >>> 32 - 7;
          u = x4 + x0 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x4 | 0;
          x12 ^= u << 13 | u >>> 32 - 13;
          u = x12 + x8 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x1 | 0;
          x9 ^= u << 7 | u >>> 32 - 7;
          u = x9 + x5 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x9 | 0;
          x1 ^= u << 13 | u >>> 32 - 13;
          u = x1 + x13 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x6 | 0;
          x14 ^= u << 7 | u >>> 32 - 7;
          u = x14 + x10 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x14 | 0;
          x6 ^= u << 13 | u >>> 32 - 13;
          u = x6 + x2 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x11 | 0;
          x3 ^= u << 7 | u >>> 32 - 7;
          u = x3 + x15 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x3 | 0;
          x11 ^= u << 13 | u >>> 32 - 13;
          u = x11 + x7 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
          u = x0 + x3 | 0;
          x1 ^= u << 7 | u >>> 32 - 7;
          u = x1 + x0 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x1 | 0;
          x3 ^= u << 13 | u >>> 32 - 13;
          u = x3 + x2 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x4 | 0;
          x6 ^= u << 7 | u >>> 32 - 7;
          u = x6 + x5 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x6 | 0;
          x4 ^= u << 13 | u >>> 32 - 13;
          u = x4 + x7 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x9 | 0;
          x11 ^= u << 7 | u >>> 32 - 7;
          u = x11 + x10 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x11 | 0;
          x9 ^= u << 13 | u >>> 32 - 13;
          u = x9 + x8 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x14 | 0;
          x12 ^= u << 7 | u >>> 32 - 7;
          u = x12 + x15 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x12 | 0;
          x14 ^= u << 13 | u >>> 32 - 13;
          u = x14 + x13 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
        }
        x0 = x0 + j0 | 0;
        x1 = x1 + j1 | 0;
        x2 = x2 + j2 | 0;
        x3 = x3 + j3 | 0;
        x4 = x4 + j4 | 0;
        x5 = x5 + j5 | 0;
        x6 = x6 + j6 | 0;
        x7 = x7 + j7 | 0;
        x8 = x8 + j8 | 0;
        x9 = x9 + j9 | 0;
        x10 = x10 + j10 | 0;
        x11 = x11 + j11 | 0;
        x12 = x12 + j12 | 0;
        x13 = x13 + j13 | 0;
        x14 = x14 + j14 | 0;
        x15 = x15 + j15 | 0;
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x1 >>> 0 & 255;
        o[5] = x1 >>> 8 & 255;
        o[6] = x1 >>> 16 & 255;
        o[7] = x1 >>> 24 & 255;
        o[8] = x2 >>> 0 & 255;
        o[9] = x2 >>> 8 & 255;
        o[10] = x2 >>> 16 & 255;
        o[11] = x2 >>> 24 & 255;
        o[12] = x3 >>> 0 & 255;
        o[13] = x3 >>> 8 & 255;
        o[14] = x3 >>> 16 & 255;
        o[15] = x3 >>> 24 & 255;
        o[16] = x4 >>> 0 & 255;
        o[17] = x4 >>> 8 & 255;
        o[18] = x4 >>> 16 & 255;
        o[19] = x4 >>> 24 & 255;
        o[20] = x5 >>> 0 & 255;
        o[21] = x5 >>> 8 & 255;
        o[22] = x5 >>> 16 & 255;
        o[23] = x5 >>> 24 & 255;
        o[24] = x6 >>> 0 & 255;
        o[25] = x6 >>> 8 & 255;
        o[26] = x6 >>> 16 & 255;
        o[27] = x6 >>> 24 & 255;
        o[28] = x7 >>> 0 & 255;
        o[29] = x7 >>> 8 & 255;
        o[30] = x7 >>> 16 & 255;
        o[31] = x7 >>> 24 & 255;
        o[32] = x8 >>> 0 & 255;
        o[33] = x8 >>> 8 & 255;
        o[34] = x8 >>> 16 & 255;
        o[35] = x8 >>> 24 & 255;
        o[36] = x9 >>> 0 & 255;
        o[37] = x9 >>> 8 & 255;
        o[38] = x9 >>> 16 & 255;
        o[39] = x9 >>> 24 & 255;
        o[40] = x10 >>> 0 & 255;
        o[41] = x10 >>> 8 & 255;
        o[42] = x10 >>> 16 & 255;
        o[43] = x10 >>> 24 & 255;
        o[44] = x11 >>> 0 & 255;
        o[45] = x11 >>> 8 & 255;
        o[46] = x11 >>> 16 & 255;
        o[47] = x11 >>> 24 & 255;
        o[48] = x12 >>> 0 & 255;
        o[49] = x12 >>> 8 & 255;
        o[50] = x12 >>> 16 & 255;
        o[51] = x12 >>> 24 & 255;
        o[52] = x13 >>> 0 & 255;
        o[53] = x13 >>> 8 & 255;
        o[54] = x13 >>> 16 & 255;
        o[55] = x13 >>> 24 & 255;
        o[56] = x14 >>> 0 & 255;
        o[57] = x14 >>> 8 & 255;
        o[58] = x14 >>> 16 & 255;
        o[59] = x14 >>> 24 & 255;
        o[60] = x15 >>> 0 & 255;
        o[61] = x15 >>> 8 & 255;
        o[62] = x15 >>> 16 & 255;
        o[63] = x15 >>> 24 & 255;
      }
      function core_hsalsa20(o, p, k, c) {
        var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
        for (var i = 0; i < 20; i += 2) {
          u = x0 + x12 | 0;
          x4 ^= u << 7 | u >>> 32 - 7;
          u = x4 + x0 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x4 | 0;
          x12 ^= u << 13 | u >>> 32 - 13;
          u = x12 + x8 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x1 | 0;
          x9 ^= u << 7 | u >>> 32 - 7;
          u = x9 + x5 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x9 | 0;
          x1 ^= u << 13 | u >>> 32 - 13;
          u = x1 + x13 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x6 | 0;
          x14 ^= u << 7 | u >>> 32 - 7;
          u = x14 + x10 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x14 | 0;
          x6 ^= u << 13 | u >>> 32 - 13;
          u = x6 + x2 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x11 | 0;
          x3 ^= u << 7 | u >>> 32 - 7;
          u = x3 + x15 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x3 | 0;
          x11 ^= u << 13 | u >>> 32 - 13;
          u = x11 + x7 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
          u = x0 + x3 | 0;
          x1 ^= u << 7 | u >>> 32 - 7;
          u = x1 + x0 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x1 | 0;
          x3 ^= u << 13 | u >>> 32 - 13;
          u = x3 + x2 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x4 | 0;
          x6 ^= u << 7 | u >>> 32 - 7;
          u = x6 + x5 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x6 | 0;
          x4 ^= u << 13 | u >>> 32 - 13;
          u = x4 + x7 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x9 | 0;
          x11 ^= u << 7 | u >>> 32 - 7;
          u = x11 + x10 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x11 | 0;
          x9 ^= u << 13 | u >>> 32 - 13;
          u = x9 + x8 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x14 | 0;
          x12 ^= u << 7 | u >>> 32 - 7;
          u = x12 + x15 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x12 | 0;
          x14 ^= u << 13 | u >>> 32 - 13;
          u = x14 + x13 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
        }
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x5 >>> 0 & 255;
        o[5] = x5 >>> 8 & 255;
        o[6] = x5 >>> 16 & 255;
        o[7] = x5 >>> 24 & 255;
        o[8] = x10 >>> 0 & 255;
        o[9] = x10 >>> 8 & 255;
        o[10] = x10 >>> 16 & 255;
        o[11] = x10 >>> 24 & 255;
        o[12] = x15 >>> 0 & 255;
        o[13] = x15 >>> 8 & 255;
        o[14] = x15 >>> 16 & 255;
        o[15] = x15 >>> 24 & 255;
        o[16] = x6 >>> 0 & 255;
        o[17] = x6 >>> 8 & 255;
        o[18] = x6 >>> 16 & 255;
        o[19] = x6 >>> 24 & 255;
        o[20] = x7 >>> 0 & 255;
        o[21] = x7 >>> 8 & 255;
        o[22] = x7 >>> 16 & 255;
        o[23] = x7 >>> 24 & 255;
        o[24] = x8 >>> 0 & 255;
        o[25] = x8 >>> 8 & 255;
        o[26] = x8 >>> 16 & 255;
        o[27] = x8 >>> 24 & 255;
        o[28] = x9 >>> 0 & 255;
        o[29] = x9 >>> 8 & 255;
        o[30] = x9 >>> 16 & 255;
        o[31] = x9 >>> 24 & 255;
      }
      function crypto_core_salsa20(out, inp, k, c) {
        core_salsa20(out, inp, k, c);
      }
      function crypto_core_hsalsa20(out, inp, k, c) {
        core_hsalsa20(out, inp, k, c);
      }
      var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
      function crypto_stream_salsa20_xor(c, cpos, m, mpos, b, n, k) {
        var z = new Uint8Array(16), x = new Uint8Array(64);
        var u, i;
        for (i = 0; i < 16; i++) z[i] = 0;
        for (i = 0; i < 8; i++) z[i] = n[i];
        while (b >= 64) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < 64; i++) c[cpos + i] = m[mpos + i] ^ x[i];
          u = 1;
          for (i = 8; i < 16; i++) {
            u = u + (z[i] & 255) | 0;
            z[i] = u & 255;
            u >>>= 8;
          }
          b -= 64;
          cpos += 64;
          mpos += 64;
        }
        if (b > 0) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < b; i++) c[cpos + i] = m[mpos + i] ^ x[i];
        }
        return 0;
      }
      function crypto_stream_salsa20(c, cpos, b, n, k) {
        var z = new Uint8Array(16), x = new Uint8Array(64);
        var u, i;
        for (i = 0; i < 16; i++) z[i] = 0;
        for (i = 0; i < 8; i++) z[i] = n[i];
        while (b >= 64) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < 64; i++) c[cpos + i] = x[i];
          u = 1;
          for (i = 8; i < 16; i++) {
            u = u + (z[i] & 255) | 0;
            z[i] = u & 255;
            u >>>= 8;
          }
          b -= 64;
          cpos += 64;
        }
        if (b > 0) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < b; i++) c[cpos + i] = x[i];
        }
        return 0;
      }
      function crypto_stream(c, cpos, d, n, k) {
        var s = new Uint8Array(32);
        crypto_core_hsalsa20(s, n, k, sigma);
        var sn = new Uint8Array(8);
        for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
        return crypto_stream_salsa20(c, cpos, d, sn, s);
      }
      function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
        var s = new Uint8Array(32);
        crypto_core_hsalsa20(s, n, k, sigma);
        var sn = new Uint8Array(8);
        for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
        return crypto_stream_salsa20_xor(c, cpos, m, mpos, d, sn, s);
      }
      var poly1305 = function(key) {
        this.buffer = new Uint8Array(16);
        this.r = new Uint16Array(10);
        this.h = new Uint16Array(10);
        this.pad = new Uint16Array(8);
        this.leftover = 0;
        this.fin = 0;
        var t0, t1, t2, t3, t4, t5, t6, t7;
        t0 = key[0] & 255 | (key[1] & 255) << 8;
        this.r[0] = t0 & 8191;
        t1 = key[2] & 255 | (key[3] & 255) << 8;
        this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
        t2 = key[4] & 255 | (key[5] & 255) << 8;
        this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
        t3 = key[6] & 255 | (key[7] & 255) << 8;
        this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
        t4 = key[8] & 255 | (key[9] & 255) << 8;
        this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
        this.r[5] = t4 >>> 1 & 8190;
        t5 = key[10] & 255 | (key[11] & 255) << 8;
        this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
        t6 = key[12] & 255 | (key[13] & 255) << 8;
        this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
        t7 = key[14] & 255 | (key[15] & 255) << 8;
        this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
        this.r[9] = t7 >>> 5 & 127;
        this.pad[0] = key[16] & 255 | (key[17] & 255) << 8;
        this.pad[1] = key[18] & 255 | (key[19] & 255) << 8;
        this.pad[2] = key[20] & 255 | (key[21] & 255) << 8;
        this.pad[3] = key[22] & 255 | (key[23] & 255) << 8;
        this.pad[4] = key[24] & 255 | (key[25] & 255) << 8;
        this.pad[5] = key[26] & 255 | (key[27] & 255) << 8;
        this.pad[6] = key[28] & 255 | (key[29] & 255) << 8;
        this.pad[7] = key[30] & 255 | (key[31] & 255) << 8;
      };
      poly1305.prototype.blocks = function(m, mpos, bytes) {
        var hibit = this.fin ? 0 : 1 << 11;
        var t0, t1, t2, t3, t4, t5, t6, t7, c;
        var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;
        var h0 = this.h[0], h1 = this.h[1], h2 = this.h[2], h3 = this.h[3], h4 = this.h[4], h5 = this.h[5], h6 = this.h[6], h7 = this.h[7], h8 = this.h[8], h9 = this.h[9];
        var r0 = this.r[0], r1 = this.r[1], r2 = this.r[2], r3 = this.r[3], r4 = this.r[4], r5 = this.r[5], r6 = this.r[6], r7 = this.r[7], r8 = this.r[8], r9 = this.r[9];
        while (bytes >= 16) {
          t0 = m[mpos + 0] & 255 | (m[mpos + 1] & 255) << 8;
          h0 += t0 & 8191;
          t1 = m[mpos + 2] & 255 | (m[mpos + 3] & 255) << 8;
          h1 += (t0 >>> 13 | t1 << 3) & 8191;
          t2 = m[mpos + 4] & 255 | (m[mpos + 5] & 255) << 8;
          h2 += (t1 >>> 10 | t2 << 6) & 8191;
          t3 = m[mpos + 6] & 255 | (m[mpos + 7] & 255) << 8;
          h3 += (t2 >>> 7 | t3 << 9) & 8191;
          t4 = m[mpos + 8] & 255 | (m[mpos + 9] & 255) << 8;
          h4 += (t3 >>> 4 | t4 << 12) & 8191;
          h5 += t4 >>> 1 & 8191;
          t5 = m[mpos + 10] & 255 | (m[mpos + 11] & 255) << 8;
          h6 += (t4 >>> 14 | t5 << 2) & 8191;
          t6 = m[mpos + 12] & 255 | (m[mpos + 13] & 255) << 8;
          h7 += (t5 >>> 11 | t6 << 5) & 8191;
          t7 = m[mpos + 14] & 255 | (m[mpos + 15] & 255) << 8;
          h8 += (t6 >>> 8 | t7 << 8) & 8191;
          h9 += t7 >>> 5 | hibit;
          c = 0;
          d0 = c;
          d0 += h0 * r0;
          d0 += h1 * (5 * r9);
          d0 += h2 * (5 * r8);
          d0 += h3 * (5 * r7);
          d0 += h4 * (5 * r6);
          c = d0 >>> 13;
          d0 &= 8191;
          d0 += h5 * (5 * r5);
          d0 += h6 * (5 * r4);
          d0 += h7 * (5 * r3);
          d0 += h8 * (5 * r2);
          d0 += h9 * (5 * r1);
          c += d0 >>> 13;
          d0 &= 8191;
          d1 = c;
          d1 += h0 * r1;
          d1 += h1 * r0;
          d1 += h2 * (5 * r9);
          d1 += h3 * (5 * r8);
          d1 += h4 * (5 * r7);
          c = d1 >>> 13;
          d1 &= 8191;
          d1 += h5 * (5 * r6);
          d1 += h6 * (5 * r5);
          d1 += h7 * (5 * r4);
          d1 += h8 * (5 * r3);
          d1 += h9 * (5 * r2);
          c += d1 >>> 13;
          d1 &= 8191;
          d2 = c;
          d2 += h0 * r2;
          d2 += h1 * r1;
          d2 += h2 * r0;
          d2 += h3 * (5 * r9);
          d2 += h4 * (5 * r8);
          c = d2 >>> 13;
          d2 &= 8191;
          d2 += h5 * (5 * r7);
          d2 += h6 * (5 * r6);
          d2 += h7 * (5 * r5);
          d2 += h8 * (5 * r4);
          d2 += h9 * (5 * r3);
          c += d2 >>> 13;
          d2 &= 8191;
          d3 = c;
          d3 += h0 * r3;
          d3 += h1 * r2;
          d3 += h2 * r1;
          d3 += h3 * r0;
          d3 += h4 * (5 * r9);
          c = d3 >>> 13;
          d3 &= 8191;
          d3 += h5 * (5 * r8);
          d3 += h6 * (5 * r7);
          d3 += h7 * (5 * r6);
          d3 += h8 * (5 * r5);
          d3 += h9 * (5 * r4);
          c += d3 >>> 13;
          d3 &= 8191;
          d4 = c;
          d4 += h0 * r4;
          d4 += h1 * r3;
          d4 += h2 * r2;
          d4 += h3 * r1;
          d4 += h4 * r0;
          c = d4 >>> 13;
          d4 &= 8191;
          d4 += h5 * (5 * r9);
          d4 += h6 * (5 * r8);
          d4 += h7 * (5 * r7);
          d4 += h8 * (5 * r6);
          d4 += h9 * (5 * r5);
          c += d4 >>> 13;
          d4 &= 8191;
          d5 = c;
          d5 += h0 * r5;
          d5 += h1 * r4;
          d5 += h2 * r3;
          d5 += h3 * r2;
          d5 += h4 * r1;
          c = d5 >>> 13;
          d5 &= 8191;
          d5 += h5 * r0;
          d5 += h6 * (5 * r9);
          d5 += h7 * (5 * r8);
          d5 += h8 * (5 * r7);
          d5 += h9 * (5 * r6);
          c += d5 >>> 13;
          d5 &= 8191;
          d6 = c;
          d6 += h0 * r6;
          d6 += h1 * r5;
          d6 += h2 * r4;
          d6 += h3 * r3;
          d6 += h4 * r2;
          c = d6 >>> 13;
          d6 &= 8191;
          d6 += h5 * r1;
          d6 += h6 * r0;
          d6 += h7 * (5 * r9);
          d6 += h8 * (5 * r8);
          d6 += h9 * (5 * r7);
          c += d6 >>> 13;
          d6 &= 8191;
          d7 = c;
          d7 += h0 * r7;
          d7 += h1 * r6;
          d7 += h2 * r5;
          d7 += h3 * r4;
          d7 += h4 * r3;
          c = d7 >>> 13;
          d7 &= 8191;
          d7 += h5 * r2;
          d7 += h6 * r1;
          d7 += h7 * r0;
          d7 += h8 * (5 * r9);
          d7 += h9 * (5 * r8);
          c += d7 >>> 13;
          d7 &= 8191;
          d8 = c;
          d8 += h0 * r8;
          d8 += h1 * r7;
          d8 += h2 * r6;
          d8 += h3 * r5;
          d8 += h4 * r4;
          c = d8 >>> 13;
          d8 &= 8191;
          d8 += h5 * r3;
          d8 += h6 * r2;
          d8 += h7 * r1;
          d8 += h8 * r0;
          d8 += h9 * (5 * r9);
          c += d8 >>> 13;
          d8 &= 8191;
          d9 = c;
          d9 += h0 * r9;
          d9 += h1 * r8;
          d9 += h2 * r7;
          d9 += h3 * r6;
          d9 += h4 * r5;
          c = d9 >>> 13;
          d9 &= 8191;
          d9 += h5 * r4;
          d9 += h6 * r3;
          d9 += h7 * r2;
          d9 += h8 * r1;
          d9 += h9 * r0;
          c += d9 >>> 13;
          d9 &= 8191;
          c = (c << 2) + c | 0;
          c = c + d0 | 0;
          d0 = c & 8191;
          c = c >>> 13;
          d1 += c;
          h0 = d0;
          h1 = d1;
          h2 = d2;
          h3 = d3;
          h4 = d4;
          h5 = d5;
          h6 = d6;
          h7 = d7;
          h8 = d8;
          h9 = d9;
          mpos += 16;
          bytes -= 16;
        }
        this.h[0] = h0;
        this.h[1] = h1;
        this.h[2] = h2;
        this.h[3] = h3;
        this.h[4] = h4;
        this.h[5] = h5;
        this.h[6] = h6;
        this.h[7] = h7;
        this.h[8] = h8;
        this.h[9] = h9;
      };
      poly1305.prototype.finish = function(mac, macpos) {
        var g = new Uint16Array(10);
        var c, mask, f, i;
        if (this.leftover) {
          i = this.leftover;
          this.buffer[i++] = 1;
          for (; i < 16; i++) this.buffer[i] = 0;
          this.fin = 1;
          this.blocks(this.buffer, 0, 16);
        }
        c = this.h[1] >>> 13;
        this.h[1] &= 8191;
        for (i = 2; i < 10; i++) {
          this.h[i] += c;
          c = this.h[i] >>> 13;
          this.h[i] &= 8191;
        }
        this.h[0] += c * 5;
        c = this.h[0] >>> 13;
        this.h[0] &= 8191;
        this.h[1] += c;
        c = this.h[1] >>> 13;
        this.h[1] &= 8191;
        this.h[2] += c;
        g[0] = this.h[0] + 5;
        c = g[0] >>> 13;
        g[0] &= 8191;
        for (i = 1; i < 10; i++) {
          g[i] = this.h[i] + c;
          c = g[i] >>> 13;
          g[i] &= 8191;
        }
        g[9] -= 1 << 13;
        mask = (c ^ 1) - 1;
        for (i = 0; i < 10; i++) g[i] &= mask;
        mask = ~mask;
        for (i = 0; i < 10; i++) this.h[i] = this.h[i] & mask | g[i];
        this.h[0] = (this.h[0] | this.h[1] << 13) & 65535;
        this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 65535;
        this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 65535;
        this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 65535;
        this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 65535;
        this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 65535;
        this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 65535;
        this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 65535;
        f = this.h[0] + this.pad[0];
        this.h[0] = f & 65535;
        for (i = 1; i < 8; i++) {
          f = (this.h[i] + this.pad[i] | 0) + (f >>> 16) | 0;
          this.h[i] = f & 65535;
        }
        mac[macpos + 0] = this.h[0] >>> 0 & 255;
        mac[macpos + 1] = this.h[0] >>> 8 & 255;
        mac[macpos + 2] = this.h[1] >>> 0 & 255;
        mac[macpos + 3] = this.h[1] >>> 8 & 255;
        mac[macpos + 4] = this.h[2] >>> 0 & 255;
        mac[macpos + 5] = this.h[2] >>> 8 & 255;
        mac[macpos + 6] = this.h[3] >>> 0 & 255;
        mac[macpos + 7] = this.h[3] >>> 8 & 255;
        mac[macpos + 8] = this.h[4] >>> 0 & 255;
        mac[macpos + 9] = this.h[4] >>> 8 & 255;
        mac[macpos + 10] = this.h[5] >>> 0 & 255;
        mac[macpos + 11] = this.h[5] >>> 8 & 255;
        mac[macpos + 12] = this.h[6] >>> 0 & 255;
        mac[macpos + 13] = this.h[6] >>> 8 & 255;
        mac[macpos + 14] = this.h[7] >>> 0 & 255;
        mac[macpos + 15] = this.h[7] >>> 8 & 255;
      };
      poly1305.prototype.update = function(m, mpos, bytes) {
        var i, want;
        if (this.leftover) {
          want = 16 - this.leftover;
          if (want > bytes)
            want = bytes;
          for (i = 0; i < want; i++)
            this.buffer[this.leftover + i] = m[mpos + i];
          bytes -= want;
          mpos += want;
          this.leftover += want;
          if (this.leftover < 16)
            return;
          this.blocks(this.buffer, 0, 16);
          this.leftover = 0;
        }
        if (bytes >= 16) {
          want = bytes - bytes % 16;
          this.blocks(m, mpos, want);
          mpos += want;
          bytes -= want;
        }
        if (bytes) {
          for (i = 0; i < bytes; i++)
            this.buffer[this.leftover + i] = m[mpos + i];
          this.leftover += bytes;
        }
      };
      function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
        var s = new poly1305(k);
        s.update(m, mpos, n);
        s.finish(out, outpos);
        return 0;
      }
      function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
        var x = new Uint8Array(16);
        crypto_onetimeauth(x, 0, m, mpos, n, k);
        return crypto_verify_16(h, hpos, x, 0);
      }
      function crypto_secretbox(c, m, d, n, k) {
        var i;
        if (d < 32) return -1;
        crypto_stream_xor(c, 0, m, 0, d, n, k);
        crypto_onetimeauth(c, 16, c, 32, d - 32, c);
        for (i = 0; i < 16; i++) c[i] = 0;
        return 0;
      }
      function crypto_secretbox_open(m, c, d, n, k) {
        var i;
        var x = new Uint8Array(32);
        if (d < 32) return -1;
        crypto_stream(x, 0, 32, n, k);
        if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0) return -1;
        crypto_stream_xor(m, 0, c, 0, d, n, k);
        for (i = 0; i < 32; i++) m[i] = 0;
        return 0;
      }
      function set25519(r, a) {
        var i;
        for (i = 0; i < 16; i++) r[i] = a[i] | 0;
      }
      function car25519(o) {
        var i, v, c = 1;
        for (i = 0; i < 16; i++) {
          v = o[i] + c + 65535;
          c = Math.floor(v / 65536);
          o[i] = v - c * 65536;
        }
        o[0] += c - 1 + 37 * (c - 1);
      }
      function sel25519(p, q, b) {
        var t, c = ~(b - 1);
        for (var i = 0; i < 16; i++) {
          t = c & (p[i] ^ q[i]);
          p[i] ^= t;
          q[i] ^= t;
        }
      }
      function pack25519(o, n) {
        var i, j, b;
        var m = gf(), t = gf();
        for (i = 0; i < 16; i++) t[i] = n[i];
        car25519(t);
        car25519(t);
        car25519(t);
        for (j = 0; j < 2; j++) {
          m[0] = t[0] - 65517;
          for (i = 1; i < 15; i++) {
            m[i] = t[i] - 65535 - (m[i - 1] >> 16 & 1);
            m[i - 1] &= 65535;
          }
          m[15] = t[15] - 32767 - (m[14] >> 16 & 1);
          b = m[15] >> 16 & 1;
          m[14] &= 65535;
          sel25519(t, m, 1 - b);
        }
        for (i = 0; i < 16; i++) {
          o[2 * i] = t[i] & 255;
          o[2 * i + 1] = t[i] >> 8;
        }
      }
      function neq25519(a, b) {
        var c = new Uint8Array(32), d = new Uint8Array(32);
        pack25519(c, a);
        pack25519(d, b);
        return crypto_verify_32(c, 0, d, 0);
      }
      function par25519(a) {
        var d = new Uint8Array(32);
        pack25519(d, a);
        return d[0] & 1;
      }
      function unpack25519(o, n) {
        var i;
        for (i = 0; i < 16; i++) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
        o[15] &= 32767;
      }
      function A(o, a, b) {
        for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
      }
      function Z(o, a, b) {
        for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
      }
      function M(o, a, b) {
        var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
        v = a[0];
        t0 += v * b0;
        t1 += v * b1;
        t2 += v * b2;
        t3 += v * b3;
        t4 += v * b4;
        t5 += v * b5;
        t6 += v * b6;
        t7 += v * b7;
        t8 += v * b8;
        t9 += v * b9;
        t10 += v * b10;
        t11 += v * b11;
        t12 += v * b12;
        t13 += v * b13;
        t14 += v * b14;
        t15 += v * b15;
        v = a[1];
        t1 += v * b0;
        t2 += v * b1;
        t3 += v * b2;
        t4 += v * b3;
        t5 += v * b4;
        t6 += v * b5;
        t7 += v * b6;
        t8 += v * b7;
        t9 += v * b8;
        t10 += v * b9;
        t11 += v * b10;
        t12 += v * b11;
        t13 += v * b12;
        t14 += v * b13;
        t15 += v * b14;
        t16 += v * b15;
        v = a[2];
        t2 += v * b0;
        t3 += v * b1;
        t4 += v * b2;
        t5 += v * b3;
        t6 += v * b4;
        t7 += v * b5;
        t8 += v * b6;
        t9 += v * b7;
        t10 += v * b8;
        t11 += v * b9;
        t12 += v * b10;
        t13 += v * b11;
        t14 += v * b12;
        t15 += v * b13;
        t16 += v * b14;
        t17 += v * b15;
        v = a[3];
        t3 += v * b0;
        t4 += v * b1;
        t5 += v * b2;
        t6 += v * b3;
        t7 += v * b4;
        t8 += v * b5;
        t9 += v * b6;
        t10 += v * b7;
        t11 += v * b8;
        t12 += v * b9;
        t13 += v * b10;
        t14 += v * b11;
        t15 += v * b12;
        t16 += v * b13;
        t17 += v * b14;
        t18 += v * b15;
        v = a[4];
        t4 += v * b0;
        t5 += v * b1;
        t6 += v * b2;
        t7 += v * b3;
        t8 += v * b4;
        t9 += v * b5;
        t10 += v * b6;
        t11 += v * b7;
        t12 += v * b8;
        t13 += v * b9;
        t14 += v * b10;
        t15 += v * b11;
        t16 += v * b12;
        t17 += v * b13;
        t18 += v * b14;
        t19 += v * b15;
        v = a[5];
        t5 += v * b0;
        t6 += v * b1;
        t7 += v * b2;
        t8 += v * b3;
        t9 += v * b4;
        t10 += v * b5;
        t11 += v * b6;
        t12 += v * b7;
        t13 += v * b8;
        t14 += v * b9;
        t15 += v * b10;
        t16 += v * b11;
        t17 += v * b12;
        t18 += v * b13;
        t19 += v * b14;
        t20 += v * b15;
        v = a[6];
        t6 += v * b0;
        t7 += v * b1;
        t8 += v * b2;
        t9 += v * b3;
        t10 += v * b4;
        t11 += v * b5;
        t12 += v * b6;
        t13 += v * b7;
        t14 += v * b8;
        t15 += v * b9;
        t16 += v * b10;
        t17 += v * b11;
        t18 += v * b12;
        t19 += v * b13;
        t20 += v * b14;
        t21 += v * b15;
        v = a[7];
        t7 += v * b0;
        t8 += v * b1;
        t9 += v * b2;
        t10 += v * b3;
        t11 += v * b4;
        t12 += v * b5;
        t13 += v * b6;
        t14 += v * b7;
        t15 += v * b8;
        t16 += v * b9;
        t17 += v * b10;
        t18 += v * b11;
        t19 += v * b12;
        t20 += v * b13;
        t21 += v * b14;
        t22 += v * b15;
        v = a[8];
        t8 += v * b0;
        t9 += v * b1;
        t10 += v * b2;
        t11 += v * b3;
        t12 += v * b4;
        t13 += v * b5;
        t14 += v * b6;
        t15 += v * b7;
        t16 += v * b8;
        t17 += v * b9;
        t18 += v * b10;
        t19 += v * b11;
        t20 += v * b12;
        t21 += v * b13;
        t22 += v * b14;
        t23 += v * b15;
        v = a[9];
        t9 += v * b0;
        t10 += v * b1;
        t11 += v * b2;
        t12 += v * b3;
        t13 += v * b4;
        t14 += v * b5;
        t15 += v * b6;
        t16 += v * b7;
        t17 += v * b8;
        t18 += v * b9;
        t19 += v * b10;
        t20 += v * b11;
        t21 += v * b12;
        t22 += v * b13;
        t23 += v * b14;
        t24 += v * b15;
        v = a[10];
        t10 += v * b0;
        t11 += v * b1;
        t12 += v * b2;
        t13 += v * b3;
        t14 += v * b4;
        t15 += v * b5;
        t16 += v * b6;
        t17 += v * b7;
        t18 += v * b8;
        t19 += v * b9;
        t20 += v * b10;
        t21 += v * b11;
        t22 += v * b12;
        t23 += v * b13;
        t24 += v * b14;
        t25 += v * b15;
        v = a[11];
        t11 += v * b0;
        t12 += v * b1;
        t13 += v * b2;
        t14 += v * b3;
        t15 += v * b4;
        t16 += v * b5;
        t17 += v * b6;
        t18 += v * b7;
        t19 += v * b8;
        t20 += v * b9;
        t21 += v * b10;
        t22 += v * b11;
        t23 += v * b12;
        t24 += v * b13;
        t25 += v * b14;
        t26 += v * b15;
        v = a[12];
        t12 += v * b0;
        t13 += v * b1;
        t14 += v * b2;
        t15 += v * b3;
        t16 += v * b4;
        t17 += v * b5;
        t18 += v * b6;
        t19 += v * b7;
        t20 += v * b8;
        t21 += v * b9;
        t22 += v * b10;
        t23 += v * b11;
        t24 += v * b12;
        t25 += v * b13;
        t26 += v * b14;
        t27 += v * b15;
        v = a[13];
        t13 += v * b0;
        t14 += v * b1;
        t15 += v * b2;
        t16 += v * b3;
        t17 += v * b4;
        t18 += v * b5;
        t19 += v * b6;
        t20 += v * b7;
        t21 += v * b8;
        t22 += v * b9;
        t23 += v * b10;
        t24 += v * b11;
        t25 += v * b12;
        t26 += v * b13;
        t27 += v * b14;
        t28 += v * b15;
        v = a[14];
        t14 += v * b0;
        t15 += v * b1;
        t16 += v * b2;
        t17 += v * b3;
        t18 += v * b4;
        t19 += v * b5;
        t20 += v * b6;
        t21 += v * b7;
        t22 += v * b8;
        t23 += v * b9;
        t24 += v * b10;
        t25 += v * b11;
        t26 += v * b12;
        t27 += v * b13;
        t28 += v * b14;
        t29 += v * b15;
        v = a[15];
        t15 += v * b0;
        t16 += v * b1;
        t17 += v * b2;
        t18 += v * b3;
        t19 += v * b4;
        t20 += v * b5;
        t21 += v * b6;
        t22 += v * b7;
        t23 += v * b8;
        t24 += v * b9;
        t25 += v * b10;
        t26 += v * b11;
        t27 += v * b12;
        t28 += v * b13;
        t29 += v * b14;
        t30 += v * b15;
        t0 += 38 * t16;
        t1 += 38 * t17;
        t2 += 38 * t18;
        t3 += 38 * t19;
        t4 += 38 * t20;
        t5 += 38 * t21;
        t6 += 38 * t22;
        t7 += 38 * t23;
        t8 += 38 * t24;
        t9 += 38 * t25;
        t10 += 38 * t26;
        t11 += 38 * t27;
        t12 += 38 * t28;
        t13 += 38 * t29;
        t14 += 38 * t30;
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        o[0] = t0;
        o[1] = t1;
        o[2] = t2;
        o[3] = t3;
        o[4] = t4;
        o[5] = t5;
        o[6] = t6;
        o[7] = t7;
        o[8] = t8;
        o[9] = t9;
        o[10] = t10;
        o[11] = t11;
        o[12] = t12;
        o[13] = t13;
        o[14] = t14;
        o[15] = t15;
      }
      function S(o, a) {
        M(o, a, a);
      }
      function inv25519(o, i) {
        var c = gf();
        var a;
        for (a = 0; a < 16; a++) c[a] = i[a];
        for (a = 253; a >= 0; a--) {
          S(c, c);
          if (a !== 2 && a !== 4) M(c, c, i);
        }
        for (a = 0; a < 16; a++) o[a] = c[a];
      }
      function pow2523(o, i) {
        var c = gf();
        var a;
        for (a = 0; a < 16; a++) c[a] = i[a];
        for (a = 250; a >= 0; a--) {
          S(c, c);
          if (a !== 1) M(c, c, i);
        }
        for (a = 0; a < 16; a++) o[a] = c[a];
      }
      function crypto_scalarmult(q, n, p) {
        var z = new Uint8Array(32);
        var x = new Float64Array(80), r, i;
        var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
        for (i = 0; i < 31; i++) z[i] = n[i];
        z[31] = n[31] & 127 | 64;
        z[0] &= 248;
        unpack25519(x, p);
        for (i = 0; i < 16; i++) {
          b[i] = x[i];
          d[i] = a[i] = c[i] = 0;
        }
        a[0] = d[0] = 1;
        for (i = 254; i >= 0; --i) {
          r = z[i >>> 3] >>> (i & 7) & 1;
          sel25519(a, b, r);
          sel25519(c, d, r);
          A(e, a, c);
          Z(a, a, c);
          A(c, b, d);
          Z(b, b, d);
          S(d, e);
          S(f, a);
          M(a, c, a);
          M(c, b, e);
          A(e, a, c);
          Z(a, a, c);
          S(b, a);
          Z(c, d, f);
          M(a, c, _121665);
          A(a, a, d);
          M(c, c, a);
          M(a, d, f);
          M(d, b, x);
          S(b, e);
          sel25519(a, b, r);
          sel25519(c, d, r);
        }
        for (i = 0; i < 16; i++) {
          x[i + 16] = a[i];
          x[i + 32] = c[i];
          x[i + 48] = b[i];
          x[i + 64] = d[i];
        }
        var x32 = x.subarray(32);
        var x16 = x.subarray(16);
        inv25519(x32, x32);
        M(x16, x16, x32);
        pack25519(q, x16);
        return 0;
      }
      function crypto_scalarmult_base(q, n) {
        return crypto_scalarmult(q, n, _9);
      }
      function crypto_box_keypair(y, x) {
        randombytes(x, 32);
        return crypto_scalarmult_base(y, x);
      }
      function crypto_box_beforenm(k, y, x) {
        var s = new Uint8Array(32);
        crypto_scalarmult(s, x, y);
        return crypto_core_hsalsa20(k, _0, s, sigma);
      }
      var crypto_box_afternm = crypto_secretbox;
      var crypto_box_open_afternm = crypto_secretbox_open;
      function crypto_box(c, m, d, n, y, x) {
        var k = new Uint8Array(32);
        crypto_box_beforenm(k, y, x);
        return crypto_box_afternm(c, m, d, n, k);
      }
      function crypto_box_open(m, c, d, n, y, x) {
        var k = new Uint8Array(32);
        crypto_box_beforenm(k, y, x);
        return crypto_box_open_afternm(m, c, d, n, k);
      }
      var K = [
        1116352408,
        3609767458,
        1899447441,
        602891725,
        3049323471,
        3964484399,
        3921009573,
        2173295548,
        961987163,
        4081628472,
        1508970993,
        3053834265,
        2453635748,
        2937671579,
        2870763221,
        3664609560,
        3624381080,
        2734883394,
        310598401,
        1164996542,
        607225278,
        1323610764,
        1426881987,
        3590304994,
        1925078388,
        4068182383,
        2162078206,
        991336113,
        2614888103,
        633803317,
        3248222580,
        3479774868,
        3835390401,
        2666613458,
        4022224774,
        944711139,
        264347078,
        2341262773,
        604807628,
        2007800933,
        770255983,
        1495990901,
        1249150122,
        1856431235,
        1555081692,
        3175218132,
        1996064986,
        2198950837,
        2554220882,
        3999719339,
        2821834349,
        766784016,
        2952996808,
        2566594879,
        3210313671,
        3203337956,
        3336571891,
        1034457026,
        3584528711,
        2466948901,
        113926993,
        3758326383,
        338241895,
        168717936,
        666307205,
        1188179964,
        773529912,
        1546045734,
        1294757372,
        1522805485,
        1396182291,
        2643833823,
        1695183700,
        2343527390,
        1986661051,
        1014477480,
        2177026350,
        1206759142,
        2456956037,
        344077627,
        2730485921,
        1290863460,
        2820302411,
        3158454273,
        3259730800,
        3505952657,
        3345764771,
        106217008,
        3516065817,
        3606008344,
        3600352804,
        1432725776,
        4094571909,
        1467031594,
        275423344,
        851169720,
        430227734,
        3100823752,
        506948616,
        1363258195,
        659060556,
        3750685593,
        883997877,
        3785050280,
        958139571,
        3318307427,
        1322822218,
        3812723403,
        1537002063,
        2003034995,
        1747873779,
        3602036899,
        1955562222,
        1575990012,
        2024104815,
        1125592928,
        2227730452,
        2716904306,
        2361852424,
        442776044,
        2428436474,
        593698344,
        2756734187,
        3733110249,
        3204031479,
        2999351573,
        3329325298,
        3815920427,
        3391569614,
        3928383900,
        3515267271,
        566280711,
        3940187606,
        3454069534,
        4118630271,
        4000239992,
        116418474,
        1914138554,
        174292421,
        2731055270,
        289380356,
        3203993006,
        460393269,
        320620315,
        685471733,
        587496836,
        852142971,
        1086792851,
        1017036298,
        365543100,
        1126000580,
        2618297676,
        1288033470,
        3409855158,
        1501505948,
        4234509866,
        1607167915,
        987167468,
        1816402316,
        1246189591
      ];
      function crypto_hashblocks_hl(hh, hl, m, n) {
        var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
        var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
        var pos = 0;
        while (n >= 128) {
          for (i = 0; i < 16; i++) {
            j = 8 * i + pos;
            wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
            wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
          }
          for (i = 0; i < 80; i++) {
            bh0 = ah0;
            bh1 = ah1;
            bh2 = ah2;
            bh3 = ah3;
            bh4 = ah4;
            bh5 = ah5;
            bh6 = ah6;
            bh7 = ah7;
            bl0 = al0;
            bl1 = al1;
            bl2 = al2;
            bl3 = al3;
            bl4 = al4;
            bl5 = al5;
            bl6 = al6;
            bl7 = al7;
            h = ah7;
            l = al7;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
            l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = ah4 & ah5 ^ ~ah4 & ah6;
            l = al4 & al5 ^ ~al4 & al6;
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = K[i * 2];
            l = K[i * 2 + 1];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = wh[i % 16];
            l = wl[i % 16];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            th = c & 65535 | d << 16;
            tl = a & 65535 | b << 16;
            h = th;
            l = tl;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
            l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = ah0 & ah1 ^ ah0 & ah2 ^ ah1 & ah2;
            l = al0 & al1 ^ al0 & al2 ^ al1 & al2;
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh7 = c & 65535 | d << 16;
            bl7 = a & 65535 | b << 16;
            h = bh3;
            l = bl3;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = th;
            l = tl;
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh3 = c & 65535 | d << 16;
            bl3 = a & 65535 | b << 16;
            ah1 = bh0;
            ah2 = bh1;
            ah3 = bh2;
            ah4 = bh3;
            ah5 = bh4;
            ah6 = bh5;
            ah7 = bh6;
            ah0 = bh7;
            al1 = bl0;
            al2 = bl1;
            al3 = bl2;
            al4 = bl3;
            al5 = bl4;
            al6 = bl5;
            al7 = bl6;
            al0 = bl7;
            if (i % 16 === 15) {
              for (j = 0; j < 16; j++) {
                h = wh[j];
                l = wl[j];
                a = l & 65535;
                b = l >>> 16;
                c = h & 65535;
                d = h >>> 16;
                h = wh[(j + 9) % 16];
                l = wl[(j + 9) % 16];
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                th = wh[(j + 1) % 16];
                tl = wl[(j + 1) % 16];
                h = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
                l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                th = wh[(j + 14) % 16];
                tl = wl[(j + 14) % 16];
                h = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
                l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                wh[j] = c & 65535 | d << 16;
                wl[j] = a & 65535 | b << 16;
              }
            }
          }
          h = ah0;
          l = al0;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[0];
          l = hl[0];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[0] = ah0 = c & 65535 | d << 16;
          hl[0] = al0 = a & 65535 | b << 16;
          h = ah1;
          l = al1;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[1];
          l = hl[1];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[1] = ah1 = c & 65535 | d << 16;
          hl[1] = al1 = a & 65535 | b << 16;
          h = ah2;
          l = al2;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[2];
          l = hl[2];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[2] = ah2 = c & 65535 | d << 16;
          hl[2] = al2 = a & 65535 | b << 16;
          h = ah3;
          l = al3;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[3];
          l = hl[3];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[3] = ah3 = c & 65535 | d << 16;
          hl[3] = al3 = a & 65535 | b << 16;
          h = ah4;
          l = al4;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[4];
          l = hl[4];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[4] = ah4 = c & 65535 | d << 16;
          hl[4] = al4 = a & 65535 | b << 16;
          h = ah5;
          l = al5;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[5];
          l = hl[5];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[5] = ah5 = c & 65535 | d << 16;
          hl[5] = al5 = a & 65535 | b << 16;
          h = ah6;
          l = al6;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[6];
          l = hl[6];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[6] = ah6 = c & 65535 | d << 16;
          hl[6] = al6 = a & 65535 | b << 16;
          h = ah7;
          l = al7;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[7];
          l = hl[7];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[7] = ah7 = c & 65535 | d << 16;
          hl[7] = al7 = a & 65535 | b << 16;
          pos += 128;
          n -= 128;
        }
        return n;
      }
      function crypto_hash(out, m, n) {
        var hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
        hh[0] = 1779033703;
        hh[1] = 3144134277;
        hh[2] = 1013904242;
        hh[3] = 2773480762;
        hh[4] = 1359893119;
        hh[5] = 2600822924;
        hh[6] = 528734635;
        hh[7] = 1541459225;
        hl[0] = 4089235720;
        hl[1] = 2227873595;
        hl[2] = 4271175723;
        hl[3] = 1595750129;
        hl[4] = 2917565137;
        hl[5] = 725511199;
        hl[6] = 4215389547;
        hl[7] = 327033209;
        crypto_hashblocks_hl(hh, hl, m, n);
        n %= 128;
        for (i = 0; i < n; i++) x[i] = m[b - n + i];
        x[n] = 128;
        n = 256 - 128 * (n < 112 ? 1 : 0);
        x[n - 9] = 0;
        ts64(x, n - 8, b / 536870912 | 0, b << 3);
        crypto_hashblocks_hl(hh, hl, x, n);
        for (i = 0; i < 8; i++) ts64(out, 8 * i, hh[i], hl[i]);
        return 0;
      }
      function add(p, q) {
        var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
        Z(a, p[1], p[0]);
        Z(t, q[1], q[0]);
        M(a, a, t);
        A(b, p[0], p[1]);
        A(t, q[0], q[1]);
        M(b, b, t);
        M(c, p[3], q[3]);
        M(c, c, D2);
        M(d, p[2], q[2]);
        A(d, d, d);
        Z(e, b, a);
        Z(f, d, c);
        A(g, d, c);
        A(h, b, a);
        M(p[0], e, f);
        M(p[1], h, g);
        M(p[2], g, f);
        M(p[3], e, h);
      }
      function cswap(p, q, b) {
        var i;
        for (i = 0; i < 4; i++) {
          sel25519(p[i], q[i], b);
        }
      }
      function pack(r, p) {
        var tx = gf(), ty = gf(), zi = gf();
        inv25519(zi, p[2]);
        M(tx, p[0], zi);
        M(ty, p[1], zi);
        pack25519(r, ty);
        r[31] ^= par25519(tx) << 7;
      }
      function scalarmult(p, q, s) {
        var b, i;
        set25519(p[0], gf0);
        set25519(p[1], gf1);
        set25519(p[2], gf1);
        set25519(p[3], gf0);
        for (i = 255; i >= 0; --i) {
          b = s[i / 8 | 0] >> (i & 7) & 1;
          cswap(p, q, b);
          add(q, p);
          add(p, p);
          cswap(p, q, b);
        }
      }
      function scalarbase(p, s) {
        var q = [gf(), gf(), gf(), gf()];
        set25519(q[0], X);
        set25519(q[1], Y);
        set25519(q[2], gf1);
        M(q[3], X, Y);
        scalarmult(p, q, s);
      }
      function crypto_sign_keypair(pk, sk, seeded) {
        var d = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()];
        var i;
        if (!seeded) randombytes(sk, 32);
        crypto_hash(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        scalarbase(p, d);
        pack(pk, p);
        for (i = 0; i < 32; i++) sk[i + 32] = pk[i];
        return 0;
      }
      var L = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
      function modL(r, x) {
        var carry, i, j, k;
        for (i = 63; i >= 32; --i) {
          carry = 0;
          for (j = i - 32, k = i - 12; j < k; ++j) {
            x[j] += carry - 16 * x[i] * L[j - (i - 32)];
            carry = Math.floor((x[j] + 128) / 256);
            x[j] -= carry * 256;
          }
          x[j] += carry;
          x[i] = 0;
        }
        carry = 0;
        for (j = 0; j < 32; j++) {
          x[j] += carry - (x[31] >> 4) * L[j];
          carry = x[j] >> 8;
          x[j] &= 255;
        }
        for (j = 0; j < 32; j++) x[j] -= carry * L[j];
        for (i = 0; i < 32; i++) {
          x[i + 1] += x[i] >> 8;
          r[i] = x[i] & 255;
        }
      }
      function reduce(r) {
        var x = new Float64Array(64), i;
        for (i = 0; i < 64; i++) x[i] = r[i];
        for (i = 0; i < 64; i++) r[i] = 0;
        modL(r, x);
      }
      function crypto_sign(sm, m, n, sk) {
        var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
        var i, j, x = new Float64Array(64);
        var p = [gf(), gf(), gf(), gf()];
        crypto_hash(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        var smlen = n + 64;
        for (i = 0; i < n; i++) sm[64 + i] = m[i];
        for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];
        crypto_hash(r, sm.subarray(32), n + 32);
        reduce(r);
        scalarbase(p, r);
        pack(sm, p);
        for (i = 32; i < 64; i++) sm[i] = sk[i];
        crypto_hash(h, sm, n + 64);
        reduce(h);
        for (i = 0; i < 64; i++) x[i] = 0;
        for (i = 0; i < 32; i++) x[i] = r[i];
        for (i = 0; i < 32; i++) {
          for (j = 0; j < 32; j++) {
            x[i + j] += h[i] * d[j];
          }
        }
        modL(sm.subarray(32), x);
        return smlen;
      }
      function unpackneg(r, p) {
        var t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
        set25519(r[2], gf1);
        unpack25519(r[1], p);
        S(num, r[1]);
        M(den, num, D);
        Z(num, num, r[2]);
        A(den, r[2], den);
        S(den2, den);
        S(den4, den2);
        M(den6, den4, den2);
        M(t, den6, num);
        M(t, t, den);
        pow2523(t, t);
        M(t, t, num);
        M(t, t, den);
        M(t, t, den);
        M(r[0], t, den);
        S(chk, r[0]);
        M(chk, chk, den);
        if (neq25519(chk, num)) M(r[0], r[0], I);
        S(chk, r[0]);
        M(chk, chk, den);
        if (neq25519(chk, num)) return -1;
        if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
        M(r[3], r[0], r[1]);
        return 0;
      }
      function crypto_sign_open(m, sm, n, pk) {
        var i;
        var t = new Uint8Array(32), h = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
        if (n < 64) return -1;
        if (unpackneg(q, pk)) return -1;
        for (i = 0; i < n; i++) m[i] = sm[i];
        for (i = 0; i < 32; i++) m[i + 32] = pk[i];
        crypto_hash(h, m, n);
        reduce(h);
        scalarmult(p, q, h);
        scalarbase(q, sm.subarray(32));
        add(p, q);
        pack(t, p);
        n -= 64;
        if (crypto_verify_32(sm, 0, t, 0)) {
          for (i = 0; i < n; i++) m[i] = 0;
          return -1;
        }
        for (i = 0; i < n; i++) m[i] = sm[i + 64];
        return n;
      }
      var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES, crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
      nacl2.lowlevel = {
        crypto_core_hsalsa20,
        crypto_stream_xor,
        crypto_stream,
        crypto_stream_salsa20_xor,
        crypto_stream_salsa20,
        crypto_onetimeauth,
        crypto_onetimeauth_verify,
        crypto_verify_16,
        crypto_verify_32,
        crypto_secretbox,
        crypto_secretbox_open,
        crypto_scalarmult,
        crypto_scalarmult_base,
        crypto_box_beforenm,
        crypto_box_afternm,
        crypto_box,
        crypto_box_open,
        crypto_box_keypair,
        crypto_hash,
        crypto_sign,
        crypto_sign_keypair,
        crypto_sign_open,
        crypto_secretbox_KEYBYTES,
        crypto_secretbox_NONCEBYTES,
        crypto_secretbox_ZEROBYTES,
        crypto_secretbox_BOXZEROBYTES,
        crypto_scalarmult_BYTES,
        crypto_scalarmult_SCALARBYTES,
        crypto_box_PUBLICKEYBYTES,
        crypto_box_SECRETKEYBYTES,
        crypto_box_BEFORENMBYTES,
        crypto_box_NONCEBYTES,
        crypto_box_ZEROBYTES,
        crypto_box_BOXZEROBYTES,
        crypto_sign_BYTES,
        crypto_sign_PUBLICKEYBYTES,
        crypto_sign_SECRETKEYBYTES,
        crypto_sign_SEEDBYTES,
        crypto_hash_BYTES,
        gf,
        D,
        L,
        pack25519,
        unpack25519,
        M,
        A,
        S,
        Z,
        pow2523,
        add,
        set25519,
        modL,
        scalarmult,
        scalarbase
      };
      function checkLengths(k, n) {
        if (k.length !== crypto_secretbox_KEYBYTES) throw new Error("bad key size");
        if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error("bad nonce size");
      }
      function checkBoxLengths(pk, sk) {
        if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error("bad public key size");
        if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error("bad secret key size");
      }
      function checkArrayTypes() {
        for (var i = 0; i < arguments.length; i++) {
          if (!(arguments[i] instanceof Uint8Array))
            throw new TypeError("unexpected type, use Uint8Array");
        }
      }
      function cleanup(arr) {
        for (var i = 0; i < arr.length; i++) arr[i] = 0;
      }
      nacl2.randomBytes = function(n) {
        var b = new Uint8Array(n);
        randombytes(b, n);
        return b;
      };
      nacl2.secretbox = function(msg, nonce, key) {
        checkArrayTypes(msg, nonce, key);
        checkLengths(key, nonce);
        var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
        var c = new Uint8Array(m.length);
        for (var i = 0; i < msg.length; i++) m[i + crypto_secretbox_ZEROBYTES] = msg[i];
        crypto_secretbox(c, m, m.length, nonce, key);
        return c.subarray(crypto_secretbox_BOXZEROBYTES);
      };
      nacl2.secretbox.open = function(box, nonce, key) {
        checkArrayTypes(box, nonce, key);
        checkLengths(key, nonce);
        var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
        var m = new Uint8Array(c.length);
        for (var i = 0; i < box.length; i++) c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
        if (c.length < 32) return null;
        if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
        return m.subarray(crypto_secretbox_ZEROBYTES);
      };
      nacl2.secretbox.keyLength = crypto_secretbox_KEYBYTES;
      nacl2.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
      nacl2.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
      nacl2.scalarMult = function(n, p) {
        checkArrayTypes(n, p);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        if (p.length !== crypto_scalarmult_BYTES) throw new Error("bad p size");
        var q = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult(q, n, p);
        return q;
      };
      nacl2.scalarMult.base = function(n) {
        checkArrayTypes(n);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        var q = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult_base(q, n);
        return q;
      };
      nacl2.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
      nacl2.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
      nacl2.box = function(msg, nonce, publicKey, secretKey) {
        var k = nacl2.box.before(publicKey, secretKey);
        return nacl2.secretbox(msg, nonce, k);
      };
      nacl2.box.before = function(publicKey, secretKey) {
        checkArrayTypes(publicKey, secretKey);
        checkBoxLengths(publicKey, secretKey);
        var k = new Uint8Array(crypto_box_BEFORENMBYTES);
        crypto_box_beforenm(k, publicKey, secretKey);
        return k;
      };
      nacl2.box.after = nacl2.secretbox;
      nacl2.box.open = function(msg, nonce, publicKey, secretKey) {
        var k = nacl2.box.before(publicKey, secretKey);
        return nacl2.secretbox.open(msg, nonce, k);
      };
      nacl2.box.open.after = nacl2.secretbox.open;
      nacl2.box.keyPair = function() {
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
        crypto_box_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl2.box.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_box_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        crypto_scalarmult_base(pk, secretKey);
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl2.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
      nacl2.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
      nacl2.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
      nacl2.box.nonceLength = crypto_box_NONCEBYTES;
      nacl2.box.overheadLength = nacl2.secretbox.overheadLength;
      nacl2.sign = function(msg, secretKey) {
        checkArrayTypes(msg, secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
        crypto_sign(signedMsg, msg, msg.length, secretKey);
        return signedMsg;
      };
      nacl2.sign.open = function(signedMsg, publicKey) {
        checkArrayTypes(signedMsg, publicKey);
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var tmp = new Uint8Array(signedMsg.length);
        var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
        if (mlen < 0) return null;
        var m = new Uint8Array(mlen);
        for (var i = 0; i < m.length; i++) m[i] = tmp[i];
        return m;
      };
      nacl2.sign.detached = function(msg, secretKey) {
        var signedMsg = nacl2.sign(msg, secretKey);
        var sig = new Uint8Array(crypto_sign_BYTES);
        for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
        return sig;
      };
      nacl2.sign.detached.verify = function(msg, sig, publicKey) {
        checkArrayTypes(msg, sig, publicKey);
        if (sig.length !== crypto_sign_BYTES)
          throw new Error("bad signature size");
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
        var m = new Uint8Array(crypto_sign_BYTES + msg.length);
        var i;
        for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
        for (i = 0; i < msg.length; i++) sm[i + crypto_sign_BYTES] = msg[i];
        return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
      };
      nacl2.sign.keyPair = function() {
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        crypto_sign_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl2.sign.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32 + i];
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl2.sign.keyPair.fromSeed = function(seed) {
        checkArrayTypes(seed);
        if (seed.length !== crypto_sign_SEEDBYTES)
          throw new Error("bad seed size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        for (var i = 0; i < 32; i++) sk[i] = seed[i];
        crypto_sign_keypair(pk, sk, true);
        return { publicKey: pk, secretKey: sk };
      };
      nacl2.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
      nacl2.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
      nacl2.sign.seedLength = crypto_sign_SEEDBYTES;
      nacl2.sign.signatureLength = crypto_sign_BYTES;
      nacl2.hash = function(msg) {
        checkArrayTypes(msg);
        var h = new Uint8Array(crypto_hash_BYTES);
        crypto_hash(h, msg, msg.length);
        return h;
      };
      nacl2.hash.hashLength = crypto_hash_BYTES;
      nacl2.verify = function(x, y) {
        checkArrayTypes(x, y);
        if (x.length === 0 || y.length === 0) return false;
        if (x.length !== y.length) return false;
        return vn(x, 0, y, 0, x.length) === 0 ? true : false;
      };
      nacl2.setPRNG = function(fn) {
        randombytes = fn;
      };
      (function() {
        var crypto2 = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
        if (crypto2 && crypto2.getRandomValues) {
          var QUOTA = 65536;
          nacl2.setPRNG(function(x, n) {
            var i, v = new Uint8Array(n);
            for (i = 0; i < n; i += QUOTA) {
              crypto2.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
            }
            for (i = 0; i < n; i++) x[i] = v[i];
            cleanup(v);
          });
        } else if (typeof require !== "undefined") {
          crypto2 = require_crypto();
          if (crypto2 && crypto2.randomBytes) {
            nacl2.setPRNG(function(x, n) {
              var i, v = crypto2.randomBytes(n);
              for (i = 0; i < n; i++) x[i] = v[i];
              cleanup(v);
            });
          }
        }
      })();
    })(typeof module2 !== "undefined" && module2.exports ? module2.exports : self.nacl = self.nacl || {});
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => VaultSpotlightPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian12 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");

// src/core/ranking.mjs
var RANKING_MODES = /* @__PURE__ */ new Set(["balanced", "filename", "recency", "metadata", "alias"]);
var DEFAULT_RANKING_SETTINGS = {
  mode: "balanced",
  preferOpenFiles: true,
  preferStarredFiles: true,
  preferBookmarkedFiles: true,
  preferRecentFiles: true,
  ignoreDiacritics: false,
  showMatchReasons: true
};
function normalizeRankingSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    mode: RANKING_MODES.has(source.mode) ? source.mode : DEFAULT_RANKING_SETTINGS.mode,
    preferOpenFiles: source.preferOpenFiles !== false,
    preferStarredFiles: source.preferStarredFiles !== false,
    preferBookmarkedFiles: source.preferBookmarkedFiles !== false,
    preferRecentFiles: source.preferRecentFiles !== false,
    ignoreDiacritics: source.ignoreDiacritics === true,
    showMatchReasons: source.showMatchReasons !== false
  };
}
function resolveRankingMode(ranking, overrideMode) {
  if (RANKING_MODES.has(overrideMode)) return overrideMode;
  return normalizeRankingSettings(ranking).mode;
}
function rankingBoosts(mode) {
  switch (mode) {
    case "filename":
      return { basename: 26, path: 8, alias: 14, browseMtimeHours: 36, queryMtimeDays: 6, frecencyWeight: 0.2 };
    case "recency":
      return { basename: 18, path: 10, alias: 14, browseMtimeHours: 180, queryMtimeDays: 18, frecencyWeight: 0.85 };
    case "metadata":
      return { basename: 16, path: 10, alias: 16, browseMtimeHours: 72, queryMtimeDays: 10, frecencyWeight: 0.45 };
    case "alias":
      return { basename: 15, path: 9, alias: 26, browseMtimeHours: 60, queryMtimeDays: 8, frecencyWeight: 0.35 };
    default:
      return { basename: 20, path: 9, alias: 18, browseMtimeHours: 100, queryMtimeDays: 10, frecencyWeight: 0.25 };
  }
}

// src/core/searchProfiles.mjs
var PROFILE_MODES = /* @__PURE__ */ new Set([
  "files",
  "content",
  "headings",
  "symbols",
  "commands",
  "links",
  "editors",
  "folders"
]);
function normalizeProfiles(rawProfiles) {
  if (!Array.isArray(rawProfiles)) return [];
  return rawProfiles.filter((profile) => profile && typeof profile === "object").map((profile) => ({
    id: cleanId(profile.id) || `profile-${Date.now()}`,
    name: String(profile.name || "Untitled profile").trim() || "Untitled profile",
    defaultMode: PROFILE_MODES.has(profile.defaultMode) ? profile.defaultMode : "files",
    defaultQuery: String(profile.defaultQuery || ""),
    includeCanvas: profile.includeCanvas !== false,
    includePdf: profile.includePdf !== false,
    includeBases: profile.includeBases !== false,
    excludeFolders: Array.isArray(profile.excludeFolders) ? profile.excludeFolders.map((f) => String(f).trim()).filter(Boolean) : [],
    showPreview: profile.showPreview === true,
    rankingMode: RANKING_MODES.has(profile.rankingMode) ? profile.rankingMode : void 0
  })).slice(0, 20);
}
function activeProfile(profiles, activeProfileId) {
  var _a;
  return (_a = profiles.find((profile) => profile.id === activeProfileId)) != null ? _a : null;
}
function createProfileFromSettings(name, settings, mode = "files", query = "") {
  var _a;
  return {
    // Random suffix on the fallback id so two unsluggable names created in
    // the same millisecond don't collide (pin/remove/activate would hit both).
    id: cleanId(name) || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || "New profile").trim() || "New profile",
    defaultMode: PROFILE_MODES.has(mode) ? mode : "files",
    defaultQuery: String(query || ""),
    includeCanvas: (settings == null ? void 0 : settings.includeCanvas) !== false,
    includePdf: (settings == null ? void 0 : settings.includePdf) !== false,
    includeBases: (settings == null ? void 0 : settings.includeBases) !== false,
    excludeFolders: Array.isArray(settings == null ? void 0 : settings.excludeFolders) ? [...settings.excludeFolders] : [],
    showPreview: (settings == null ? void 0 : settings.showPreview) === true,
    rankingMode: RANKING_MODES.has((_a = settings == null ? void 0 : settings.ranking) == null ? void 0 : _a.mode) ? settings.ranking.mode : void 0
  };
}
function cleanId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// src/core/workflowPresets.mjs
var FREE_WORKFLOW_LIMIT = 2;
var MAX_WORKFLOW_PRESETS = 25;
var STARTER_WORKFLOWS = [
  { id: "starter-recent-work", name: "Recent work", mode: "files", query: "modified:7", pinned: true, starter: true },
  { id: "starter-follow-ups", name: "Follow-ups", mode: "files", query: "#waiting OR #followup", pinned: true, starter: true },
  { id: "starter-meetings", name: "Meeting notes", mode: "content", query: '"action item" OR "next step"', pinned: false, starter: true },
  { id: "starter-clients", name: "Client folder", mode: "files", query: "in:Clients", pinned: false, starter: true }
];
function normalizeWorkflowPresets(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((workflow) => workflow && typeof workflow === "object").map((workflow, index) => ({
    id: cleanId2(workflow.id) || `workflow-${Date.now()}-${index}`,
    name: String(workflow.name || "Untitled workflow").trim() || "Untitled workflow",
    query: typeof workflow.query === "string" ? workflow.query : String(workflow.query || ""),
    mode: PROFILE_MODES.has(workflow.mode) ? workflow.mode : "files",
    profileId: cleanId2(workflow.profileId),
    pinned: workflow.pinned === true,
    starter: workflow.starter === true,
    rankingMode: RANKING_MODES.has(workflow.rankingMode) ? workflow.rankingMode : void 0
  })).slice(0, MAX_WORKFLOW_PRESETS);
}
function ensureStarterWorkflows(workflows) {
  const normalized = normalizeWorkflowPresets(workflows);
  return normalized.length > 0 ? normalized : STARTER_WORKFLOWS.map((workflow) => ({ ...workflow }));
}
function canSaveWorkflowPreset(workflows, isPro) {
  if (isPro) return true;
  return normalizeWorkflowPresets(workflows).length < FREE_WORKFLOW_LIMIT;
}
function createWorkflowPreset(name, mode, query, options = {}) {
  return {
    // A random suffix on the fallback id avoids collisions when two presets
    // with unsluggable names (all symbols) are created in the same millisecond.
    id: cleanId2(name) || `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || "New workflow").trim() || "New workflow",
    mode: PROFILE_MODES.has(mode) ? mode : "files",
    query: String(query || ""),
    profileId: cleanId2(options.profileId),
    pinned: options.pinned === true,
    starter: options.starter === true,
    rankingMode: RANKING_MODES.has(options.rankingMode) ? options.rankingMode : void 0
  };
}
function cleanId2(value) {
  const id = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return id || "";
}

// src/core/snippets.mjs
var MAX_SNIPPETS = 100;
var counter = 0;
function nextId(seed) {
  counter += 1;
  return `sn-${seed}-${counter}`;
}
function normalizeSnippets(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const body = typeof entry.body === "string" ? entry.body : "";
    if (name.length === 0) continue;
    let id = typeof entry.id === "string" && entry.id.length > 0 ? entry.id : nextId(name.length);
    while (seen.has(id)) id = nextId(name.length);
    seen.add(id);
    out.push({ id, name, body });
    if (out.length >= MAX_SNIPPETS) break;
  }
  return out;
}
function createSnippet(name, body) {
  return { id: nextId(String(name != null ? name : "").length), name: String(name != null ? name : "").trim(), body: String(body != null ? body : "") };
}
function expandSnippet(body, ctx = {}) {
  var _a, _b, _c, _d;
  const values = {
    date: (_a = ctx.date) != null ? _a : "",
    time: (_b = ctx.time) != null ? _b : "",
    clipboard: (_c = ctx.clipboard) != null ? _c : "",
    selection: (_d = ctx.selection) != null ? _d : ""
  };
  const substitute = (segment) => String(segment).replace(/\{\{(date|time|clipboard|selection)\}\}/g, (_, key) => values[key]);
  const raw = String(body != null ? body : "");
  const cursorToken = "{{cursor}}";
  const idx = raw.indexOf(cursorToken);
  if (idx === -1) {
    const text = substitute(raw);
    return { text, cursorOffset: text.length };
  }
  const before = substitute(raw.slice(0, idx));
  const after = substitute(raw.slice(idx + cursorToken.length).split(cursorToken).join(""));
  return { text: before + after, cursorOffset: before.length };
}

// src/core/modeTriggers.mjs
var DEFAULT_MODE_PREFIXES = {
  content: ">",
  commands: ":",
  headings: "^",
  symbols: "$",
  links: "~",
  editors: "=",
  folders: "/",
  capture: "+",
  snippets: ";"
};
var DEFAULT_ESCAPE_CHAR = "!";
function normalizeModePrefixes(raw) {
  var _a;
  const out = { ...DEFAULT_MODE_PREFIXES };
  if (!raw || typeof raw !== "object") return out;
  const taken = /* @__PURE__ */ new Set();
  const spares = ["`", ",", "'", "?", "%", "&", "*"];
  for (const mode of Object.keys(DEFAULT_MODE_PREFIXES)) {
    const value = typeof raw[mode] === "string" ? raw[mode].trim() : "";
    let next = value.length > 0 && value.length <= 4 && !/\s/.test(value) && !taken.has(value) ? value : DEFAULT_MODE_PREFIXES[mode];
    if (taken.has(next)) next = (_a = spares.find((c) => !taken.has(c))) != null ? _a : next;
    out[mode] = next;
    taken.add(next);
  }
  return out;
}
function normalizeEscapeChar(raw) {
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.length === 1 && !/\s/.test(value) ? value : DEFAULT_ESCAPE_CHAR;
}
function detectModeFromPrefix(raw, prefixes = DEFAULT_MODE_PREFIXES, escapeChar = DEFAULT_ESCAPE_CHAR) {
  const trimmed = String(raw != null ? raw : "").trimStart();
  if (escapeChar && trimmed.startsWith(escapeChar)) {
    return { mode: null, body: trimmed.slice(escapeChar.length).trimStart(), escaped: true };
  }
  let best = null;
  for (const [mode, prefix] of Object.entries(prefixes || {})) {
    if (!prefix || !trimmed.startsWith(prefix)) continue;
    if (!best || prefix.length > best.prefix.length) best = { mode, prefix };
  }
  if (!best) return { mode: null, body: trimmed, escaped: false };
  return { mode: best.mode, body: trimmed.slice(best.prefix.length).trimStart(), escaped: false };
}
function parseHeadingQuery(raw) {
  let levelMin = null;
  let levelMax = null;
  const withoutLevels = String(raw != null ? raw : "").split(/\s+/).filter((token) => {
    const match = token.toLowerCase().match(/^level:(\d)(?:-(\d))?$/);
    if (!match) return true;
    const a = Number(match[1]);
    const b = match[2] !== void 0 ? Number(match[2]) : a;
    levelMin = Math.max(1, Math.min(a, b));
    levelMax = Math.min(6, Math.max(a, b));
    if (levelMin > levelMax) {
      levelMin = null;
      levelMax = null;
    }
    return false;
  }).join(" ").trim();
  const hash = withoutLevels.indexOf("#");
  if (hash === -1) {
    return { fileQuery: "", headingQuery: withoutLevels, levelMin, levelMax };
  }
  return {
    fileQuery: withoutLevels.slice(0, hash).trim(),
    headingQuery: withoutLevels.slice(hash + 1).trim(),
    levelMin,
    levelMax
  };
}
function pushRecentCommand(recentIds, id, max = 25) {
  const cleaned = (Array.isArray(recentIds) ? recentIds : []).filter(
    (existing) => typeof existing === "string" && existing !== id
  );
  cleaned.unshift(id);
  return cleaned.slice(0, max);
}
function previousFilePath(recentPaths, activePath) {
  for (const path of Array.isArray(recentPaths) ? recentPaths : []) {
    if (path !== activePath) return path;
  }
  return null;
}

// src/settings.ts
function safeHttpUrl(url, fallback) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch (e) {
  }
  return fallback;
}
var MAX_CUSTOM_SEARCHES = 50;
var MAX_RECENT_SEARCHES = 15;
var DEFAULT_SETTINGS = {
  licenseKey: "",
  isPro: false,
  licenseEmail: "",
  purchaseUrl: "https://buymeacoffee.com/vaultspotlight",
  recentPaths: [],
  starredPaths: [],
  maxRecent: 30,
  maxStarred: 50,
  customSearches: [],
  pinnedCustomSearchIds: [],
  workflowPresets: [],
  searchProfiles: [],
  activeProfileId: "",
  ranking: { ...DEFAULT_RANKING_SETTINGS },
  searchAliases: "",
  showModifiedTime: true,
  ripgrepCommand: "rg",
  includeCanvas: true,
  includePdf: true,
  includeBases: true,
  excludeFolders: [],
  fileFrecency: {},
  useFrecency: true,
  showPreview: false,
  recentSearches: [],
  modePrefixes: { ...DEFAULT_MODE_PREFIXES },
  escapeChar: DEFAULT_ESCAPE_CHAR,
  defaultNewTab: false,
  recentCommandIds: [],
  enableCalculator: true,
  currencyRates: "",
  enableDateJump: true,
  captureInboxPath: "",
  captureMode: "append",
  captureHeading: "",
  snippets: []
};
var MAX_RECENT_COMMANDS = 25;
var VaultSpotlightSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("License key").setDesc("Enter your Pro license key. Verified offline \u2014 no account or server required.").addText(
      (text) => text.setPlaceholder("payload.signature").setValue(this.plugin.settings.licenseKey).onChange((value) => {
        this.plugin.settings.licenseKey = value;
        void this.plugin.refreshLicense(true).then((changed) => {
          if (changed) this.display();
        });
      })
    );
    const status = containerEl.createDiv({ cls: "vault-spotlight-license-status" });
    if (this.plugin.settings.isPro) {
      status.createEl("p", {
        text: `Pro active${this.plugin.settings.licenseEmail ? ` (${this.plugin.settings.licenseEmail})` : ""}.`
      });
    } else {
      status.createEl("p", { text: "Free tier active. Upgrade to unlock batch open, content search, and saved commands." });
      const link = status.createEl("a", {
        text: "Get Pro on Buy Me a Coffee",
        // Only render http(s) URLs — a stored "javascript:" value would
        // otherwise become a clickable script link (self-XSS) in the pane.
        href: safeHttpUrl(this.plugin.settings.purchaseUrl, DEFAULT_SETTINGS.purchaseUrl)
      });
      link.setAttr("target", "_blank");
      link.setAttr("rel", "noopener noreferrer");
    }
    new import_obsidian.Setting(containerEl).setName("Purchase page URL").setDesc("Link shown for Pro upgrades. Defaults to Buy Me a Coffee.").addText(
      (text) => text.setPlaceholder("https://your-store.com/product").setValue(this.plugin.settings.purchaseUrl).onChange((value) => {
        const trimmed = value.trim();
        this.plugin.settings.purchaseUrl = trimmed ? safeHttpUrl(trimmed, DEFAULT_SETTINGS.purchaseUrl) : DEFAULT_SETTINGS.purchaseUrl;
        void this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Show modified time").setDesc("Display relative modified time in search results.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showModifiedTime).onChange((value) => {
        this.plugin.settings.showModifiedTime = value;
        void this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Smart ranking (frecency)").setDesc("Rank browse/recent results by how often and how recently you open each note.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.useFrecency).onChange((value) => {
        this.plugin.settings.useFrecency = value;
        void this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Ranking & match reasons").setHeading();
    new import_obsidian.Setting(containerEl).setName("Default ranking mode").setDesc("Choose what file search should prioritize when several notes match.").addDropdown((dropdown) => {
      dropdown.addOption("balanced", "Balanced").addOption("filename", "Filename first").addOption("recency", "Recency first").addOption("metadata", "Metadata first").addOption("alias", "Alias aware").setValue(this.plugin.settings.ranking.mode).onChange((value) => {
        this.plugin.settings.ranking.mode = value;
        void this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Prefer open files").setDesc("Boost notes that are already open in an editor.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.ranking.preferOpenFiles).onChange((value) => {
        this.plugin.settings.ranking.preferOpenFiles = value;
        void this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Prefer starred, bookmarked, and recent files").setDesc("Keep pinned work and recently touched notes near the top of browse results.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.ranking.preferStarredFiles && this.plugin.settings.ranking.preferBookmarkedFiles && this.plugin.settings.ranking.preferRecentFiles).onChange((value) => {
        this.plugin.settings.ranking.preferStarredFiles = value;
        this.plugin.settings.ranking.preferBookmarkedFiles = value;
        this.plugin.settings.ranking.preferRecentFiles = value;
        void this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Ignore diacritics").setDesc("Treat caf\xE9 like cafe when matching filenames and aliases.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.ranking.ignoreDiacritics).onChange((value) => {
        this.plugin.settings.ranking.ignoreDiacritics = value;
        void this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Show match reasons").setDesc("Display why a result ranked well, such as Alias match or Starred.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.ranking.showMatchReasons).onChange((value) => {
        this.plugin.settings.ranking.showMatchReasons = value;
        void this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Excluded folders").setDesc("One folder path per line (e.g. templates, archive/old). Files inside are hidden from all search modes.").addTextArea((area) => {
      area.setPlaceholder("templates\narchive/old");
      area.setValue(this.plugin.settings.excludeFolders.join("\n"));
      area.inputEl.rows = 4;
      area.onChange((value) => {
        this.plugin.settings.excludeFolders = value.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
        void this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Calculator & dates").setHeading();
    new import_obsidian.Setting(containerEl).setName("Inline calculator").setDesc("Type math, unit conversions, or percentages (e.g. 1234*0.19, 10 km to mi, 20% of 250) and press Enter to copy the answer.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableCalculator).onChange((value) => {
        this.plugin.settings.enableCalculator = value;
        void this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Currency rates").setDesc("One per line as CODE=rate, expressed in units per 1 USD (e.g. EUR=0.92). Used for offline currency conversion \u2014 you keep them current.").addTextArea((area) => {
      area.setPlaceholder("USD=1\nEUR=0.92\nGBP=0.79");
      area.setValue(this.plugin.settings.currencyRates);
      area.inputEl.rows = 4;
      area.onChange((value) => {
        this.plugin.settings.currencyRates = value;
        void this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Daily-note date jump").setDesc("Type a date like today, next friday, or in 3 weeks to open (or create) that day's daily note. Honors your Daily Notes / Periodic Notes settings.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableDateJump).onChange((value) => {
        this.plugin.settings.enableDateJump = value;
        void this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Opening & mode triggers").setHeading();
    new import_obsidian.Setting(containerEl).setName("Open in new tab by default").setDesc("Enter opens results in a new tab. Ctrl+Enter then opens in the current tab instead.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.defaultNewTab).onChange((value) => {
        this.plugin.settings.defaultNewTab = value;
        void this.plugin.saveSettings();
      })
    );
    const prefixLabels = [
      { key: "content", name: "Content search trigger", desc: "Search inside note bodies (Pro)." },
      { key: "commands", name: "Command trigger", desc: "Search and run commands." },
      { key: "headings", name: "Headings trigger", desc: "Jump to headings across the vault (Pro)." },
      { key: "symbols", name: "Symbols trigger", desc: "Outline of the active note: headings, links, tags, blocks." },
      { key: "links", name: "Links trigger", desc: "Backlinks and outlinks (Pro)." },
      { key: "editors", name: "Open editors trigger", desc: "Jump between open tabs and panes." },
      { key: "folders", name: "Folders trigger", desc: "Find a folder and browse its files." },
      { key: "capture", name: "Quick capture trigger", desc: "Append a note to your daily note or inbox without opening it." },
      { key: "snippets", name: "Snippets trigger", desc: "Insert reusable text snippets at the cursor (Pro)." }
    ];
    for (const { key, name, desc } of prefixLabels) {
      new import_obsidian.Setting(containerEl).setName(name).setDesc(`${desc} Default: ${DEFAULT_MODE_PREFIXES[key]}`).addText((text) => {
        text.inputEl.maxLength = 4;
        text.inputEl.addClass("vault-spotlight-prefix-input");
        text.setValue(this.plugin.settings.modePrefixes[key]).onChange((value) => {
          this.plugin.settings.modePrefixes = normalizeModePrefixes({
            ...this.plugin.settings.modePrefixes,
            [key]: value
          });
          void this.plugin.saveSettings();
        });
      });
    }
    new import_obsidian.Setting(containerEl).setName("Escape character").setDesc(`Start a query with this character to search trigger characters literally. Default: ${DEFAULT_ESCAPE_CHAR}`).addText((text) => {
      text.inputEl.maxLength = 1;
      text.inputEl.addClass("vault-spotlight-prefix-input");
      text.setValue(this.plugin.settings.escapeChar).onChange((value) => {
        this.plugin.settings.escapeChar = normalizeEscapeChar(value);
        void this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Pro search").setHeading();
    const proSearch = (name, desc, render) => {
      const setting = new import_obsidian.Setting(containerEl).setName(name).setDesc(desc);
      if (!this.plugin.settings.isPro) {
        setting.settingEl.addClass("vault-spotlight-setting-locked");
        setting.descEl.appendText(" (Pro)");
        return;
      }
      render(setting);
    };
    proSearch(
      "Ripgrep command",
      "Faster content search when ripgrep (rg) is installed. Leave as rg \u2014 common install locations (winget, scoop, chocolatey, Homebrew, VS Code's bundled rg) are auto-detected when it isn't on your PATH.",
      (setting) => {
        setting.addText(
          (text) => text.setPlaceholder("rg").setValue(this.plugin.settings.ripgrepCommand).onChange((value) => {
            this.plugin.settings.ripgrepCommand = value.trim() || "rg";
            this.plugin.contentSearcher.setRipgrepCommand(this.plugin.settings.ripgrepCommand);
            void this.plugin.saveSettings();
          })
        );
      }
    );
    proSearch("Include Canvas files", "Search .canvas files by name and search text inside canvas nodes.", (setting) => {
      setting.addToggle(
        (toggle) => toggle.setValue(this.plugin.settings.includeCanvas).onChange((value) => {
          this.plugin.settings.includeCanvas = value;
          void this.plugin.saveSettings();
        })
      );
    });
    proSearch("Include PDF files", "Show PDFs in file search (filename). PDF body text search is not supported.", (setting) => {
      setting.addToggle(
        (toggle) => toggle.setValue(this.plugin.settings.includePdf).onChange((value) => {
          this.plugin.settings.includePdf = value;
          void this.plugin.saveSettings();
        })
      );
    });
    proSearch(
      "Include Base files",
      "Show Bases (.base) in file search and search text inside their view and filter definitions.",
      (setting) => {
        setting.addToggle(
          (toggle) => toggle.setValue(this.plugin.settings.includeBases).onChange((value) => {
            this.plugin.settings.includeBases = value;
            void this.plugin.saveSettings();
          })
        );
      }
    );
    proSearch(
      "Preview pane",
      "Show a live preview of the highlighted note beside the results.",
      (setting) => {
        setting.addToggle(
          (toggle) => toggle.setValue(this.plugin.settings.showPreview).onChange((value) => {
            this.plugin.settings.showPreview = value;
            void this.plugin.saveSettings();
          })
        );
      }
    );
    new import_obsidian.Setting(containerEl).setName("Quick capture").setHeading();
    containerEl.createEl("p", {
      cls: "vault-spotlight-hint-text",
      text: "Type the capture trigger, jot a thought, and press Enter \u2014 it appends to today's daily note without opening it. Pro adds an inbox target, prepend, and a target heading."
    });
    proSearch(
      "Inbox note",
      "Optional second capture target \u2014 a vault path like Inbox.md. Appears as an extra row in capture mode.",
      (setting) => {
        setting.addText(
          (text) => text.setPlaceholder("Inbox.md").setValue(this.plugin.settings.captureInboxPath).onChange((value) => {
            this.plugin.settings.captureInboxPath = value.trim();
            void this.plugin.saveSettings();
          })
        );
      }
    );
    proSearch("Capture placement", "Add captured lines to the end (append) or top (prepend) of the target note.", (setting) => {
      setting.addDropdown((dropdown) => {
        dropdown.addOption("append", "Append to end").addOption("prepend", "Prepend to top").setValue(this.plugin.settings.captureMode).onChange((value) => {
          this.plugin.settings.captureMode = value;
          void this.plugin.saveSettings();
        });
      });
    });
    proSearch(
      "Capture under heading",
      "Optional heading (e.g. Log) to append captured lines beneath. Created if missing. Leave blank to use the placement above.",
      (setting) => {
        setting.addText(
          (text) => text.setPlaceholder("Log").setValue(this.plugin.settings.captureHeading).onChange((value) => {
            this.plugin.settings.captureHeading = value.trim();
            void this.plugin.saveSettings();
          })
        );
      }
    );
    new import_obsidian.Setting(containerEl).setName("Snippets (Pro)").setHeading();
    const snippetList = containerEl.createDiv();
    if (!this.plugin.settings.isPro) {
      snippetList.createEl("p", {
        text: "Unlock Pro to insert reusable text snippets with {{date}}, {{time}}, {{clipboard}}, {{selection}}, and {{cursor}} placeholders."
      });
    } else {
      new import_obsidian.Setting(snippetList).setName("Add snippet").setDesc("Snippets appear in snippet mode and insert at the cursor. Placeholders: {{date}} {{time}} {{clipboard}} {{selection}} {{cursor}}.").addButton(
        (button) => button.setButtonText("Add snippet").onClick(() => {
          const snippet = createSnippet(`Snippet ${this.plugin.settings.snippets.length + 1}`, "");
          this.plugin.settings.snippets = [...this.plugin.settings.snippets, snippet].slice(0, MAX_SNIPPETS);
          void this.plugin.saveSettings().then(() => this.display());
        })
      );
      if (this.plugin.settings.snippets.length === 0) {
        snippetList.createEl("p", { text: "No snippets yet. Add one to insert boilerplate, callouts, or signatures from the launcher." });
      } else {
        for (const snippet of this.plugin.settings.snippets) {
          const row = snippetList.createDiv({ cls: "vault-spotlight-snippet-row" });
          const nameInput = row.createEl("input", { type: "text", cls: "vault-spotlight-snippet-name" });
          nameInput.value = snippet.name;
          nameInput.placeholder = "Name";
          nameInput.addEventListener("change", () => {
            snippet.name = nameInput.value.trim() || snippet.name;
            nameInput.value = snippet.name;
            void this.plugin.saveSettings();
          });
          const bodyInput = row.createEl("textarea", { cls: "vault-spotlight-snippet-body" });
          bodyInput.value = snippet.body;
          bodyInput.rows = 2;
          bodyInput.placeholder = "Snippet text with {{cursor}}";
          bodyInput.addEventListener("change", () => {
            snippet.body = bodyInput.value;
            void this.plugin.saveSettings();
          });
          const remove = row.createEl("button", { text: "Remove" });
          remove.addEventListener("click", () => {
            this.plugin.settings.snippets = this.plugin.settings.snippets.filter((s) => s.id !== snippet.id);
            void this.plugin.saveSettings().then(() => this.display());
          });
        }
      }
    }
    new import_obsidian.Setting(containerEl).setName("Starred files (Pro)").setHeading();
    const starredList = containerEl.createDiv();
    if (!this.plugin.settings.isPro) {
      starredList.createEl("p", { text: "Pin important files with Ctrl+D in the spotlight." });
    } else if (this.plugin.settings.starredPaths.length === 0) {
      starredList.createEl("p", { text: "No starred files yet. Select a result and press Ctrl+D." });
    } else {
      for (const path of this.plugin.settings.starredPaths) {
        const row = starredList.createDiv({ cls: "vault-spotlight-starred-row" });
        row.createSpan({ text: path });
        const btn = row.createEl("button", { text: "Remove" });
        btn.addEventListener("click", () => {
          this.plugin.settings.starredPaths = this.plugin.settings.starredPaths.filter((p) => p !== path);
          void this.plugin.saveSettings().then(() => this.display());
        });
      }
    }
    new import_obsidian.Setting(containerEl).setName("Search aliases (Pro)").setDesc("One alias per line, e.g. crm = in:Clients @type:client. Aliases expand before search.").addTextArea((area) => {
      area.setPlaceholder("crm = in:Clients @type:client\nwaiting = #waiting");
      area.setValue(this.plugin.settings.searchAliases);
      area.inputEl.rows = 4;
      area.onChange((value) => {
        this.plugin.settings.searchAliases = value;
        void this.plugin.saveSettings();
      });
    });
    new import_obsidian.Setting(containerEl).setName("Workflow presets (Pro)").setHeading();
    const workflowList = containerEl.createDiv();
    if (!this.plugin.settings.isPro) {
      workflowList.createEl("p", { text: "Unlock Pro to save and run reusable workflows from Browse." });
    } else {
      new import_obsidian.Setting(workflowList).setName("Starter workflows").setDesc("Seed Browse mode with a few high-signal workflow presets.").addButton(
        (button) => button.setButtonText("Load starters").onClick(() => {
          this.plugin.settings.workflowPresets = ensureStarterWorkflows(this.plugin.settings.workflowPresets);
          void this.plugin.saveSettings().then(() => this.display());
        })
      );
      if (this.plugin.settings.workflowPresets.length === 0) {
        workflowList.createEl("p", { text: "No workflows yet. Save one from Spotlight with Ctrl+S, or load the starter workflows." });
      } else {
        for (const workflow of this.plugin.settings.workflowPresets) {
          const row = workflowList.createDiv({ cls: "vault-spotlight-starred-row" });
          row.createSpan({
            text: `${workflow.pinned ? "\u2605 " : ""}${workflow.name}: ${workflow.mode}${workflow.query ? ` \xB7 ${workflow.query}` : ""}${workflow.rankingMode ? ` \xB7 ${workflow.rankingMode}` : ""}`
          });
          const pinBtn = row.createEl("button", { text: workflow.pinned ? "Unpin" : "Pin" });
          pinBtn.addEventListener("click", () => {
            this.plugin.settings.workflowPresets = this.plugin.settings.workflowPresets.map(
              (entry) => entry.id === workflow.id ? { ...entry, pinned: !entry.pinned } : entry
            );
            void this.plugin.saveSettings().then(() => this.display());
          });
          const remove = row.createEl("button", { text: workflow.starter ? "Hide" : "Remove" });
          remove.addEventListener("click", () => {
            this.plugin.settings.workflowPresets = this.plugin.settings.workflowPresets.filter((entry) => entry.id !== workflow.id);
            void this.plugin.saveSettings().then(() => this.display());
          });
        }
      }
    }
    new import_obsidian.Setting(containerEl).setName("Search profiles (Pro)").setHeading();
    const profileList = containerEl.createDiv();
    if (!this.plugin.settings.isPro) {
      profileList.createEl("p", { text: "Unlock Pro to save workspace-style search profiles." });
    } else {
      new import_obsidian.Setting(profileList).setName("Save current settings as profile").setDesc("Profiles remember file type toggles, excluded folders, preview preference, and a default query/mode.").addButton(
        (button) => button.setButtonText("Add profile").onClick(() => {
          const profile = createProfileFromSettings(`Profile ${this.plugin.settings.searchProfiles.length + 1}`, this.plugin.settings);
          this.plugin.settings.searchProfiles = [...this.plugin.settings.searchProfiles, profile].slice(0, 20);
          void this.plugin.saveSettings().then(() => this.display());
        })
      );
      if (this.plugin.settings.searchProfiles.length === 0) {
        profileList.createEl("p", { text: "No search profiles yet. Add one here or save one from the action palette." });
      } else {
        for (const profile of this.plugin.settings.searchProfiles) {
          const row = profileList.createDiv({ cls: "vault-spotlight-starred-row" });
          const active = profile.id === this.plugin.settings.activeProfileId;
          row.createSpan({ text: `${active ? "\u2713 " : ""}${profile.name}: ${profile.defaultMode}${profile.defaultQuery ? ` \xB7 ${profile.defaultQuery}` : ""}` });
          const activate = row.createEl("button", { text: active ? "Active" : "Activate" });
          activate.disabled = active;
          activate.addEventListener("click", () => {
            this.plugin.settings.activeProfileId = profile.id;
            void this.plugin.saveSettings().then(() => this.display());
          });
          const remove = row.createEl("button", { text: "Remove" });
          remove.addEventListener("click", () => {
            this.plugin.settings.searchProfiles = this.plugin.settings.searchProfiles.filter((p) => p.id !== profile.id);
            if (this.plugin.settings.activeProfileId === profile.id) this.plugin.settings.activeProfileId = "";
            void this.plugin.saveSettings().then(() => this.display());
          });
        }
      }
    }
    new import_obsidian.Setting(containerEl).setName("Custom searches (Pro)").setHeading();
    const customList = containerEl.createDiv();
    if (!this.plugin.settings.isPro) {
      customList.createEl("p", { text: "Unlock Pro to save custom search commands." });
    } else if (this.plugin.settings.customSearches.length === 0) {
      customList.createEl("p", { text: "No custom searches yet. Create one from the spotlight with Ctrl+S." });
    } else {
      for (const search of this.plugin.settings.customSearches) {
        const row = customList.createDiv({ cls: "vault-spotlight-starred-row" });
        const pinned = this.plugin.settings.pinnedCustomSearchIds.includes(search.id);
        row.createSpan({ text: `${pinned ? "\u2605 " : ""}${search.name}: ${search.query}` });
        const pinBtn = row.createEl("button", { text: pinned ? "Unpin" : "Pin" });
        pinBtn.addEventListener("click", () => {
          this.plugin.togglePinnedCollection(search.id);
          this.display();
        });
        const btn = row.createEl("button", { text: "Remove" });
        btn.addEventListener("click", () => {
          this.plugin.deleteCustomSearch(search.id);
          this.display();
        });
      }
    }
  }
};

// src/spotlight/SpotlightModal.ts
var import_obsidian9 = require("obsidian");

// src/core/advancedQuery.mjs
function parseAdvancedQuery(raw) {
  const tokens = tokenizeAdvanced(raw);
  const out = {
    textTokens: [],
    phrases: [],
    exclusions: [],
    folderIncludes: [],
    pathTerms: [],
    nameTerms: [],
    tags: [],
    properties: [],
    extFilters: [],
    isStarred: false,
    isBookmarked: false,
    modifiedDays: null,
    createdDays: null
  };
  for (const token of tokens) {
    const value = token.value.trim();
    if (!value) continue;
    if (token.quoted) {
      out.phrases.push(value.toLowerCase());
      continue;
    }
    const lower = value.toLowerCase();
    if (lower.startsWith("-") && lower.length > 1) out.exclusions.push(lower.slice(1));
    else if (lower.startsWith("in:") && lower.length > 3) out.folderIncludes.push(lower.slice(3));
    else if (lower.startsWith("path:") && lower.length > 5) out.pathTerms.push(lower.slice(5));
    else if (lower.startsWith("name:") && lower.length > 5) out.nameTerms.push(lower.slice(5));
    else if (lower.startsWith("tag:") && lower.length > 4) out.tags.push(lower.slice(4).replace(/^#/, ""));
    else if (lower.startsWith("#") && lower.length > 1) out.tags.push(lower.slice(1));
    else if (lower.startsWith("prop:") && lower.length > 5) addProperty(out, lower.slice(5));
    else if (lower.startsWith("@") && lower.length > 1) addProperty(out, lower.slice(1));
    else if (lower.startsWith("ext:") && lower.length > 4) out.extFilters.push(lower.slice(4).replace(/^\./, ""));
    else if (lower.startsWith("modified:") && lower.length > 9) out.modifiedDays = parseDays(lower.slice(9));
    else if (lower.startsWith("created:") && lower.length > 8) out.createdDays = parseDays(lower.slice(8));
    else if (lower === "is:starred") out.isStarred = true;
    else if (lower === "is:bookmarked") out.isBookmarked = true;
    else if (lower !== "#" && lower !== "@" && lower !== "ext:") out.textTokens.push(lower);
  }
  return out;
}
function addProperty(out, raw) {
  const eq = raw.indexOf("=");
  const colon = raw.indexOf(":");
  const sep = eq === -1 ? colon : colon === -1 ? eq : Math.min(eq, colon);
  if (sep === -1) out.properties.push({ key: raw, value: null });
  else {
    const key = raw.slice(0, sep);
    if (key) out.properties.push({ key, value: raw.slice(sep + 1) || null });
  }
}
function parseDays(raw) {
  const n = Number(String(raw).replace(/d$/, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.max(1, n);
}
function tokenizeAdvanced(raw) {
  const tokens = [];
  const input = String(raw || "").trim();
  let current = "";
  let quoted = false;
  let inlineQuote = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (inlineQuote) {
        inlineQuote = false;
      } else if (quoted) {
        tokens.push({ value: current, quoted: true });
        current = "";
        quoted = false;
      } else if (current.length > 0) {
        inlineQuote = true;
      } else {
        quoted = true;
      }
      continue;
    }
    if (!quoted && !inlineQuote && /\s/.test(ch)) {
      if (current.trim()) tokens.push({ value: current.trim(), quoted: false });
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) tokens.push({ value: current.trim(), quoted });
  return tokens;
}

// src/core/fuzzy.mjs
function fuzzyMatch(query, text, options = {}) {
  var _a;
  if (!query) {
    return { score: 0, indices: [] };
  }
  const fold = options.ignoreDiacritics === true ? stripDiacritics : identity;
  const q = fold(query).toLowerCase();
  const foldedText = fold(text);
  const t = foldedText.toLowerCase();
  let qi = 0;
  let lastMatch = -1;
  let score = 0;
  const indices = [];
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      if (lastMatch === ti - 1) {
        score += 8;
      } else if (ti === 0 || /[\s\-_/]/.test((_a = foldedText[ti - 1]) != null ? _a : "")) {
        score += 12;
      } else {
        score += 4;
      }
      if (ti < 6) score += 2;
      lastMatch = ti;
      qi++;
    }
  }
  if (qi < q.length) {
    return typoFallback(q, foldedText);
  }
  if (t.includes(q)) score += 20;
  if (t.startsWith(q)) score += 30;
  return { score, indices };
}
function typoFallback(q, text) {
  if (q.length < 4) return null;
  const tolerance = q.length <= 5 ? 1 : q.length <= 9 ? 2 : 3;
  let best = Infinity;
  for (const word of text.toLowerCase().split(/[\s\-_/]+/)) {
    if (!word) continue;
    if (Math.abs(word.length - q.length) > tolerance) continue;
    const d = boundedLevenshtein(q, word, tolerance);
    if (d < best) best = d;
    if (best === 0) break;
  }
  if (best > tolerance) return null;
  return { score: Math.max(1, 8 - best * 2), indices: [] };
}
function boundedLevenshtein(a, b, max) {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}
function stripDiacritics(value) {
  return String(value).normalize("NFD").replace(/\p{Diacritic}+/gu, "");
}
function identity(value) {
  return String(value);
}

// src/search/fuzzy.ts
function renderHighlightedText(parent, text, indices) {
  parent.empty();
  if (indices.length === 0) {
    parent.setText(text);
    return;
  }
  const set = new Set(indices);
  let i = 0;
  while (i < text.length) {
    const highlight = set.has(i);
    let j = i + 1;
    while (j < text.length && set.has(j) === highlight) {
      j++;
    }
    const chunk = text.slice(i, j);
    if (highlight) {
      parent.createEl("mark", { text: chunk });
    } else {
      parent.appendText(chunk);
    }
    i = j;
  }
}
function tokenizeQuery(raw) {
  return parseAdvancedQuery(raw.trim());
}

// src/search/metadata.ts
var import_obsidian2 = require("obsidian");

// src/core/metadataCore.mjs
function normalizeTag(tag) {
  return tag.replace(/^#/, "").toLowerCase();
}
function fileMatchesTags(fileTags, queryTags) {
  for (const queryTag of queryTags) {
    if (fileTags.has(queryTag)) continue;
    const hasMatch = [...fileTags].some((tag) => {
      if (tag === queryTag) return true;
      if (tag.startsWith(`${queryTag}/`)) return true;
      return tag.split("/").some((part) => part === queryTag || part.startsWith(queryTag));
    });
    if (!hasMatch) return false;
  }
  return true;
}
function getFrontmatterValue(frontmatter, key) {
  if (Object.prototype.hasOwnProperty.call(frontmatter, key)) {
    return frontmatter[key];
  }
  const lower = key.toLowerCase();
  for (const entryKey of Object.keys(frontmatter)) {
    if (entryKey.toLowerCase() === lower) {
      return frontmatter[entryKey];
    }
  }
  return void 0;
}
function frontmatterValueMatches(raw, queryValue) {
  if (raw === void 0 || raw === null) return false;
  if (queryValue === null) return true;
  if (Array.isArray(raw)) {
    return raw.some((item) => String(item).toLowerCase().includes(queryValue));
  }
  if (typeof raw === "object") {
    return JSON.stringify(raw).toLowerCase().includes(queryValue);
  }
  return String(raw).toLowerCase().includes(queryValue);
}

// src/search/metadata.ts
function collectFileTags(cache) {
  var _a, _b, _c, _d;
  const tags = /* @__PURE__ */ new Set();
  for (const tag of (_a = (0, import_obsidian2.getAllTags)(cache)) != null ? _a : []) {
    tags.add(normalizeTag(tag));
  }
  for (const entry of (_b = cache.tags) != null ? _b : []) {
    tags.add(normalizeTag(entry.tag));
  }
  for (const tag of (_d = (0, import_obsidian2.parseFrontMatterTags)((_c = cache.frontmatter) != null ? _c : null)) != null ? _d : []) {
    tags.add(normalizeTag(tag));
  }
  return tags;
}

// src/search/vaultFiles.ts
function getVaultFileKind(file) {
  if (file.extension === "canvas") return "canvas";
  if (file.extension === "pdf") return "pdf";
  if (file.extension === "base") return "base";
  return "markdown";
}
function normalizeExcludeFolders(folders) {
  if (!Array.isArray(folders)) return [];
  return folders.map((f) => f.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase()).filter((f) => f.length > 0);
}
function isPathExcluded(path, normalizedFolders) {
  if (normalizedFolders.length === 0) return false;
  const p = path.replace(/\\/g, "/").toLowerCase();
  return normalizedFolders.some((f) => p === f || p.startsWith(`${f}/`));
}
function getSearchableFiles(app, options) {
  const excluded = normalizeExcludeFolders(options.excludeFolders);
  const files = [];
  for (const file of app.vault.getFiles()) {
    if (isPathExcluded(file.path, excluded)) continue;
    if (file.extension === "md") {
      files.push(file);
    } else if (options.includeCanvas && file.extension === "canvas") {
      files.push(file);
    } else if (options.includePdf && file.extension === "pdf") {
      files.push(file);
    } else if (options.includeBases && file.extension === "base") {
      files.push(file);
    }
  }
  return files;
}
function iconForFileKind(kind) {
  switch (kind) {
    case "canvas":
      return "layout-dashboard";
    case "pdf":
      return "file-type";
    case "base":
      return "database";
    default:
      return "file-text";
  }
}

// src/core/fileAliases.mjs
function extractAliases(frontmatter) {
  if (!frontmatter || typeof frontmatter !== "object") return [];
  const raw = [];
  for (const key of ["aliases", "alias"]) {
    const value = frontmatter[key];
    if (Array.isArray(value)) raw.push(...value);
    else if (value !== void 0 && value !== null) raw.push(value);
  }
  return raw.map((value) => String(value).trim()).filter(Boolean);
}
function aliasMatches(frontmatter, query) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return false;
  return extractAliases(frontmatter).some((alias) => alias.toLowerCase().includes(q));
}

// src/search/FileSearcher.ts
var FileSearcher = class {
  constructor(app) {
    this.app = app;
  }
  search(options) {
    var _a, _b, _c, _d, _e, _f, _g;
    const files = getSearchableFiles(this.app, {
      includeCanvas: options.includeCanvas,
      includePdf: options.includePdf,
      includeBases: (_a = options.includeBases) != null ? _a : false,
      excludeFolders: options.excludeFolders
    });
    const limit = (_b = options.limit) != null ? _b : 50;
    const results = [];
    const ranking = normalizeRankingSettings(options.ranking);
    const boosts = rankingBoosts(resolveRankingMode(ranking, options.rankingMode));
    const recentSet = new Map(options.recentPaths.map((p, i) => [p, i]));
    const starredSet = new Map(options.starredPaths.map((p, i) => [p, i]));
    const bookmarkedSet = new Set((_c = options.bookmarkedPaths) != null ? _c : []);
    const hasActiveFilters = options.tags.length > 0 || options.properties.length > 0 || options.extFilters.length > 0;
    const isBrowseMode = options.textTokens.length === 0 && !hasActiveFilters;
    const isFilterOnly = options.textTokens.length === 0 && hasActiveFilters;
    for (const file of files) {
      if (!this.matchesExtFilter(file, options.extFilters)) continue;
      if (!this.matchesAdvancedFileFilters(file, options, starredSet.has(file.path), bookmarkedSet.has(file.path))) continue;
      if (!this.matchesFilters(file, options)) continue;
      const basename = file.basename;
      let score = 0;
      let primaryMatch = isBrowseMode ? "browse" : isFilterOnly ? "filters" : "filename";
      let aliasMatched = false;
      const indices = [];
      if (isBrowseMode) {
        score = 1;
      } else if (isFilterOnly) {
        score = 100;
        primaryMatch = "filters";
      } else {
        let matched = true;
        for (const token of [...(_d = options.nameTerms) != null ? _d : [], ...options.textTokens]) {
          const basenameMatch = fuzzyMatch(token, basename, { ignoreDiacritics: ranking.ignoreDiacritics });
          if (basenameMatch) {
            score += basenameMatch.score + boosts.basename;
            primaryMatch = "filename";
            indices.push(...basenameMatch.indices);
            continue;
          }
          const pathMatch = fuzzyMatch(token, file.path, { ignoreDiacritics: ranking.ignoreDiacritics });
          const aliasHit = this.aliasMatches(file, token);
          if (!pathMatch && !aliasHit) {
            matched = false;
            break;
          }
          if (aliasHit) {
            aliasMatched = true;
            primaryMatch = "alias";
            score += boosts.alias;
          } else if (pathMatch) {
            if (primaryMatch !== "filename") primaryMatch = "path";
            score += Math.floor(pathMatch.score / 2) + boosts.path;
          }
        }
        if (!matched) score = 0;
      }
      if (score <= 0) continue;
      const cache = file.extension === "md" ? this.app.metadataCache.getFileCache(file) : null;
      const tags = cache ? Array.from(collectFileTags(cache)).slice(0, 3) : [];
      const aliases = extractAliases((_e = cache == null ? void 0 : cache.frontmatter) != null ? _e : null).slice(0, 3);
      const starredRank = starredSet.get(file.path);
      const recentRank = recentSet.get(file.path);
      if (ranking.preferStarredFiles && starredRank !== void 0) {
        score += 3e3 - starredRank * 10;
      } else if (ranking.preferBookmarkedFiles && bookmarkedSet.has(file.path)) {
        score += 2e3;
      } else if (ranking.preferRecentFiles && recentRank !== void 0) {
        score += 1e3 - recentRank * 10;
      } else if (isBrowseMode) {
        score += Math.max(0, boosts.browseMtimeHours - Math.floor((Date.now() - file.stat.mtime) / 36e5));
      } else {
        score += Math.max(0, boosts.queryMtimeDays - Math.floor((Date.now() - file.stat.mtime) / 864e5));
      }
      if (ranking.preferOpenFiles && ((_f = options.openPaths) == null ? void 0 : _f.has(file.path))) score += 400;
      const fr = (_g = options.frecency) == null ? void 0 : _g[file.path];
      if (fr) {
        const freqBoost = Math.min(300, fr.count * 15);
        const ageDays = (Date.now() - fr.last) / 864e5;
        const recencyBoost = Math.max(0, 60 - Math.floor(ageDays) * 2);
        const weight = isBrowseMode || isFilterOnly ? 1 : boosts.frecencyWeight;
        score += Math.floor((freqBoost + recencyBoost) * weight);
      }
      results.push({
        file,
        score,
        matchIndices: indices,
        modifiedLabel: formatRelativeTime(file.stat.mtime),
        fileKind: getVaultFileKind(file),
        primaryMatch,
        aliasMatched,
        tags,
        aliases,
        isRecent: recentSet.has(file.path),
        isStarred: starredSet.has(file.path),
        isBookmarked: bookmarkedSet.has(file.path)
      });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  matchesExtFilter(file, extFilters) {
    if (extFilters.length === 0) return true;
    return extFilters.includes(file.extension.toLowerCase());
  }
  aliasMatches(file, token) {
    var _a;
    if (file.extension !== "md") return false;
    const cache = this.app.metadataCache.getFileCache(file);
    return aliasMatches((_a = cache == null ? void 0 : cache.frontmatter) != null ? _a : null, token);
  }
  matchesFilters(file, options) {
    if (file.extension !== "md") {
      return options.tags.length === 0 && options.properties.length === 0;
    }
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return options.tags.length === 0 && options.properties.length === 0;
    if (options.tags.length > 0) {
      const tags = collectFileTags(cache);
      if (!fileMatchesTags(tags, options.tags)) return false;
    }
    for (const prop of options.properties) {
      const fm = cache.frontmatter;
      if (!fm) return false;
      const raw = getFrontmatterValue(fm, prop.key);
      if (!frontmatterValueMatches(raw, prop.value)) return false;
    }
    return true;
  }
  matchesAdvancedFileFilters(file, options, isStarred, isBookmarked) {
    var _a, _b, _c, _d, _e, _f;
    const lowerPath = file.path.toLowerCase();
    const lowerName = file.basename.toLowerCase();
    if (options.isStarred && !isStarred) return false;
    if (options.isBookmarked && !isBookmarked) return false;
    for (const folder of (_a = options.folderIncludes) != null ? _a : []) {
      const normalized = folder.toLowerCase().replace(/\/$/, "");
      if (!lowerPath.startsWith(`${normalized}/`) && !lowerPath.includes(`/${normalized}/`)) return false;
    }
    for (const term of (_b = options.pathTerms) != null ? _b : []) {
      if (!lowerPath.includes(term.toLowerCase())) return false;
    }
    for (const term of (_c = options.nameTerms) != null ? _c : []) {
      if (!lowerName.includes(term.toLowerCase()) && !fuzzyMatch(term, lowerName, { ignoreDiacritics: ((_d = options.ranking) == null ? void 0 : _d.ignoreDiacritics) === true })) return false;
    }
    for (const phrase of (_e = options.phrases) != null ? _e : []) {
      if (!lowerPath.includes(phrase.toLowerCase())) return false;
    }
    for (const exclusion of (_f = options.exclusions) != null ? _f : []) {
      if (lowerPath.includes(exclusion.toLowerCase())) return false;
    }
    if (options.modifiedDays !== null && options.modifiedDays !== void 0) {
      if (Date.now() - file.stat.mtime > options.modifiedDays * 864e5) return false;
    }
    if (options.createdDays !== null && options.createdDays !== void 0) {
      if (Date.now() - file.stat.ctime > options.createdDays * 864e5) return false;
    }
    return true;
  }
};
function formatRelativeTime(mtime) {
  const diff = Date.now() - mtime;
  const mins = Math.floor(diff / 6e4);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(mtime).toLocaleDateString();
}

// src/search/HeadingSearcher.ts
var HeadingSearcher = class {
  constructor(app) {
    this.app = app;
  }
  search(query, options = {}) {
    var _a, _b, _c;
    const limit = (_a = options.limit) != null ? _a : 50;
    const excluded = normalizeExcludeFolders(options.excludeFolders);
    const q = query.trim();
    const fileQuery = (_c = (_b = options.fileQuery) == null ? void 0 : _b.trim()) != null ? _c : "";
    const results = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (isPathExcluded(file.path, excluded)) continue;
      if (fileQuery && !fuzzyMatch(fileQuery, file.basename) && !fuzzyMatch(fileQuery, file.path)) continue;
      const cache = this.app.metadataCache.getFileCache(file);
      const headings = cache == null ? void 0 : cache.headings;
      if (!headings || headings.length === 0) continue;
      for (const h of headings) {
        if (options.levelMin != null && h.level < options.levelMin) continue;
        if (options.levelMax != null && h.level > options.levelMax) continue;
        let score = 1;
        let matchIndices = [];
        if (q.length > 0) {
          const match = fuzzyMatch(q, h.heading);
          if (!match) continue;
          score = match.score;
          matchIndices = match.indices;
        }
        results.push({
          file,
          heading: h.heading,
          level: h.level,
          line: h.position.start.line + 1,
          score,
          matchIndices
        });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
};

// src/search/CommandSearcher.ts
var CommandSearcher = class {
  constructor(app) {
    this.app = app;
  }
  api() {
    const api = this.app.commands;
    return api != null ? api : null;
  }
  list() {
    const api = this.api();
    if (!api) return [];
    if (typeof api.listCommands === "function") {
      try {
        return api.listCommands().filter((c) => c && c.id && c.name);
      } catch (e) {
        return [];
      }
    }
    if (api.commands) {
      return Object.values(api.commands).filter((c) => c && c.id && c.name);
    }
    return [];
  }
  search(query, limit = 50) {
    const commands = this.list();
    const q = query.trim();
    const results = [];
    for (const cmd of commands) {
      if (q.length === 0) {
        results.push({ id: cmd.id, name: cmd.name, score: 1, matchIndices: [] });
        continue;
      }
      const match = fuzzyMatch(q, cmd.name);
      if (!match) continue;
      results.push({ id: cmd.id, name: cmd.name, score: match.score, matchIndices: match.indices });
    }
    results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return results.slice(0, limit);
  }
  execute(id) {
    const api = this.api();
    if (!api || typeof api.executeCommandById !== "function") return false;
    try {
      return api.executeCommandById(id);
    } catch (e) {
      return false;
    }
  }
};

// src/search/SymbolSearcher.ts
var SYMBOL_ICONS = {
  heading: "heading",
  link: "link",
  embed: "paperclip",
  tag: "tag",
  block: "box"
};
function iconForSymbolType(type) {
  return SYMBOL_ICONS[type];
}
var SymbolSearcher = class {
  constructor(app) {
    this.app = app;
  }
  search(file, query, limit = 100) {
    var _a, _b, _c, _d, _e;
    if (file.extension !== "md") return [];
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];
    const raw = [];
    for (const h of (_a = cache.headings) != null ? _a : []) {
      raw.push({ text: h.heading, symbolType: "heading", line: h.position.start.line + 1, level: h.level });
    }
    for (const l of (_b = cache.links) != null ? _b : []) {
      raw.push({
        text: l.displayText && l.displayText !== l.link ? `${l.link} (${l.displayText})` : l.link,
        symbolType: "link",
        line: l.position.start.line + 1,
        level: 0
      });
    }
    for (const e of (_c = cache.embeds) != null ? _c : []) {
      raw.push({ text: e.link, symbolType: "embed", line: e.position.start.line + 1, level: 0 });
    }
    for (const t of (_d = cache.tags) != null ? _d : []) {
      raw.push({ text: t.tag, symbolType: "tag", line: t.position.start.line + 1, level: 0 });
    }
    for (const [id, block] of Object.entries((_e = cache.blocks) != null ? _e : {})) {
      raw.push({ text: `^${id}`, symbolType: "block", line: block.position.start.line + 1, level: 0 });
    }
    const q = query.trim();
    const results = [];
    for (const symbol of raw) {
      let score = 1;
      let matchIndices = [];
      if (q.length > 0) {
        const match = fuzzyMatch(q, symbol.text);
        if (!match) continue;
        score = match.score;
        matchIndices = match.indices;
      }
      results.push({ file, ...symbol, score, matchIndices });
    }
    if (q.length === 0) results.sort((a, b) => a.line - b.line);
    else results.sort((a, b) => b.score - a.score || a.line - b.line);
    return results.slice(0, limit);
  }
};

// src/search/EditorSearcher.ts
var import_obsidian3 = require("obsidian");
var IGNORED_VIEW_TYPES = /* @__PURE__ */ new Set([
  "file-explorer",
  "search",
  "tag",
  "bookmarks",
  "outline",
  "backlink",
  "outgoing-link",
  "all-properties",
  "file-properties",
  "sync",
  "empty"
]);
var EditorSearcher = class {
  constructor(app) {
    this.app = app;
  }
  openFilePaths() {
    const paths = /* @__PURE__ */ new Set();
    this.app.workspace.iterateAllLeaves((leaf) => {
      const file = this.leafFile(leaf);
      if (file) paths.add(file.path);
    });
    return paths;
  }
  search(query, limit = 60) {
    const q = query.trim();
    const activeLeaf = this.app.workspace.getMostRecentLeaf();
    const rows = [];
    this.app.workspace.iterateAllLeaves((leaf) => {
      var _a, _b, _c;
      const viewType = (_c = (_b = (_a = leaf.view) == null ? void 0 : _a.getViewType) == null ? void 0 : _b.call(_a)) != null ? _c : "";
      if (IGNORED_VIEW_TYPES.has(viewType)) return;
      const file = this.leafFile(leaf);
      const title = file ? file.basename : leaf.getDisplayText();
      if (!title) return;
      let score = 1;
      let matchIndices = [];
      if (q.length > 0) {
        const titleMatch = fuzzyMatch(q, title);
        const match = titleMatch != null ? titleMatch : file ? fuzzyMatch(q, file.path) : null;
        if (!match) return;
        score = match.score;
        matchIndices = titleMatch ? match.indices : [];
      }
      const extras = leaf;
      rows.push({
        leaf,
        file,
        title,
        viewType,
        isActive: leaf === activeLeaf,
        isPinned: extras.pinned === true,
        score,
        matchIndices,
        mru: typeof extras.activeTime === "number" ? extras.activeTime : 0
      });
    });
    rows.sort((a, b) => {
      if (q.length > 0) return b.score - a.score || b.mru - a.mru;
      return Number(b.isActive) - Number(a.isActive) || Number(b.isPinned) - Number(a.isPinned) || b.mru - a.mru;
    });
    return rows.slice(0, limit).map((row) => ({
      leaf: row.leaf,
      file: row.file,
      title: row.title,
      viewType: row.viewType,
      isActive: row.isActive,
      isPinned: row.isPinned,
      score: row.score,
      matchIndices: row.matchIndices
    }));
  }
  activate(leaf) {
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    void this.app.workspace.revealLeaf(leaf);
  }
  leafFile(leaf) {
    var _a;
    const file = (_a = leaf.view) == null ? void 0 : _a.file;
    return file instanceof import_obsidian3.TFile ? file : null;
  }
};

// src/spotlight/SaveSearchPromptModal.ts
var import_obsidian4 = require("obsidian");
var SaveSearchPromptModal = class extends import_obsidian4.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    new import_obsidian4.Setting(contentEl).setName("Name this search").setHeading();
    new import_obsidian4.Setting(contentEl).setName("Search name").addText((text) => {
      this.inputEl = text.inputEl;
      text.setPlaceholder("Weekly review notes").onChange(() => {
      });
    }).addButton(
      (btn) => btn.setButtonText("Save").setCta().onClick(() => {
        const name = this.inputEl.value.trim();
        if (!name) return;
        this.onSubmit(name);
        this.close();
      })
    );
    this.inputEl.focus();
    this.inputEl.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        const name = this.inputEl.value.trim();
        if (!name) return;
        this.onSubmit(name);
        this.close();
      }
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/spotlight/PromptModal.ts
var import_obsidian5 = require("obsidian");
var PromptModal = class extends import_obsidian5.Modal {
  constructor(app, opts) {
    super(app);
    this.opts = opts;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    new import_obsidian5.Setting(contentEl).setName(this.opts.title).setHeading();
    new import_obsidian5.Setting(contentEl).addText((text) => {
      var _a;
      this.inputEl = text.inputEl;
      text.setValue((_a = this.opts.initial) != null ? _a : "");
    }).addButton(
      (btn) => {
        var _a;
        return btn.setButtonText((_a = this.opts.cta) != null ? _a : "OK").setCta().onClick(() => this.submit());
      }
    );
    this.inputEl.focus();
    this.inputEl.select();
    this.inputEl.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        this.submit();
      }
    });
  }
  submit() {
    const value = this.inputEl.value.trim();
    if (!value) return;
    this.opts.onSubmit(value);
    this.close();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/core/integrations.mjs
function detectSearchIntegrations(pluginIds) {
  const ids = new Set((pluginIds || []).map((id) => String(id).toLowerCase()));
  return {
    omnisearch: ids.has("omnisearch") || ids.has("obsidian-omnisearch"),
    textExtractor: ids.has("text-extractor") || ids.has("obsidian-text-extractor"),
    basesPowerPack: ids.has("bases-power-pack")
  };
}

// src/core/linkGraph.mjs
function findBacklinks(files, resolvedLinks, targetPath) {
  const byPath = fileMap(files);
  const rows = [];
  for (const [source, links] of Object.entries(resolvedLinks || {})) {
    const count = Number((links == null ? void 0 : links[targetPath]) || 0);
    if (count > 0 && byPath.has(source)) rows.push({ file: byPath.get(source), count });
  }
  return rows.sort((a, b) => b.count - a.count || a.file.path.localeCompare(b.file.path)).map((row) => row.file);
}
function findOutlinks(files, resolvedLinks, sourcePath) {
  const byPath = fileMap(files);
  return Object.keys((resolvedLinks == null ? void 0 : resolvedLinks[sourcePath]) || {}).filter((path) => byPath.has(path)).sort((a, b) => a.localeCompare(b)).map((path) => byPath.get(path));
}
function fileMap(files) {
  return new Map((files || []).map((file) => [file.path, file]));
}

// src/core/calculator.mjs
var DEFAULT_CURRENCY_RATES = {
  usd: 1,
  eur: 0.92,
  gbp: 0.79,
  jpy: 156,
  cad: 1.37,
  aud: 1.51,
  chf: 0.9,
  cny: 7.25,
  inr: 83.3
};
var UNIT_CATEGORIES = {
  length: {
    base: "m",
    units: {
      mm: 1e-3,
      cm: 0.01,
      dm: 0.1,
      m: 1,
      km: 1e3,
      in: 0.0254,
      inch: 0.0254,
      inches: 0.0254,
      ft: 0.3048,
      foot: 0.3048,
      feet: 0.3048,
      yd: 0.9144,
      yard: 0.9144,
      yards: 0.9144,
      mi: 1609.344,
      mile: 1609.344,
      miles: 1609.344,
      nmi: 1852
    }
  },
  mass: {
    base: "g",
    units: {
      mg: 1e-3,
      g: 1,
      gram: 1,
      grams: 1,
      kg: 1e3,
      kgs: 1e3,
      t: 1e6,
      tonne: 1e6,
      tonnes: 1e6,
      oz: 28.349523125,
      ounce: 28.349523125,
      ounces: 28.349523125,
      lb: 453.59237,
      lbs: 453.59237,
      pound: 453.59237,
      pounds: 453.59237,
      st: 6350.29318,
      stone: 6350.29318
    }
  },
  data: {
    base: "b",
    units: {
      b: 1,
      byte: 1,
      bytes: 1,
      bit: 0.125,
      bits: 0.125,
      kb: 1e3,
      mb: 1e6,
      gb: 1e9,
      tb: 1e12,
      pb: 1e15,
      kib: 1024,
      mib: 1024 ** 2,
      gib: 1024 ** 3,
      tib: 1024 ** 4
    }
  },
  time: {
    base: "s",
    units: {
      ms: 1e-3,
      s: 1,
      sec: 1,
      secs: 1,
      second: 1,
      seconds: 1,
      min: 60,
      mins: 60,
      minute: 60,
      minutes: 60,
      h: 3600,
      hr: 3600,
      hrs: 3600,
      hour: 3600,
      hours: 3600,
      d: 86400,
      day: 86400,
      days: 86400,
      wk: 604800,
      week: 604800,
      weeks: 604800
    }
  }
};
var TEMPERATURE_UNITS = /* @__PURE__ */ new Set(["c", "celsius", "f", "fahrenheit", "k", "kelvin"]);
function categoryOf(unit) {
  for (const [name, table] of Object.entries(UNIT_CATEGORIES)) {
    if (unit in table.units) return name;
  }
  return null;
}
function toCelsius(value, unit) {
  if (unit === "c" || unit === "celsius") return value;
  if (unit === "f" || unit === "fahrenheit") return (value - 32) * (5 / 9);
  return value - 273.15;
}
function fromCelsius(value, unit) {
  if (unit === "c" || unit === "celsius") return value;
  if (unit === "f" || unit === "fahrenheit") return value * (9 / 5) + 32;
  return value + 273.15;
}
function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  const rounded = Number(value.toFixed(6));
  if (rounded === 0 && value !== 0) return value.toExponential(2);
  const [intPart, decPart] = String(rounded).split(".");
  const withThousands = Number(intPart).toLocaleString("en-US");
  return decPart ? `${withThousands}.${decPart}` : withThousands;
}
var OPERATORS = {
  "+": { prec: 2, assoc: "left", apply: (a, b) => a + b },
  "-": { prec: 2, assoc: "left", apply: (a, b) => a - b },
  "*": { prec: 3, assoc: "left", apply: (a, b) => a * b },
  "\xD7": { prec: 3, assoc: "left", apply: (a, b) => a * b },
  "/": { prec: 3, assoc: "left", apply: (a, b) => a / b },
  "\xF7": { prec: 3, assoc: "left", apply: (a, b) => a / b },
  "%": { prec: 3, assoc: "left", apply: (a, b) => a % b },
  "^": { prec: 4, assoc: "right", apply: (a, b) => a ** b }
};
function tokenizeMath(input) {
  var _a, _b;
  const tokens = [];
  let i = 0;
  const s = input.replace(/,/g, "");
  while (i < s.length) {
    const ch = s[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
      if ((num.match(/\./g) || []).length > 1) return null;
      tokens.push({ type: "num", value: Number(num) });
      continue;
    }
    if (ch === "(" || ch === ")") {
      tokens.push({ type: ch === "(" ? "lparen" : "rparen" });
      i++;
      continue;
    }
    if (ch === "e" && /[0-9.]/.test((_a = s[i - 1]) != null ? _a : "") && /[-+0-9]/.test((_b = s[i + 1]) != null ? _b : "")) {
      const prev = tokens.pop();
      let exp = s[++i] === "+" || s[i] === "-" ? s[i++] : "";
      while (i < s.length && /[0-9]/.test(s[i])) exp += s[i++];
      tokens.push({ type: "num", value: Number(`${prev.value}e${exp}`) });
      continue;
    }
    if (ch in OPERATORS) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    return null;
  }
  return tokens;
}
function evalMathTokens(tokens) {
  const output = [];
  const ops = [];
  let prevWasValue = false;
  const drainUnary = () => {
    while (ops.length && ops[ops.length - 1].type === "unary") output.push(ops.pop());
  };
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type === "num") {
      output.push(t.value);
      prevWasValue = true;
    } else if (t.type === "op") {
      const op = t.value;
      if (!prevWasValue && (op === "-" || op === "+")) {
        if (op === "-") ops.push({ type: "unary" });
        prevWasValue = false;
        continue;
      }
      const o1 = OPERATORS[op];
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type === "unary") {
          output.push(ops.pop());
          continue;
        }
        if (top.type !== "op") break;
        const o2 = OPERATORS[top.value];
        if (o1.assoc === "left" && o1.prec <= o2.prec || o1.assoc === "right" && o1.prec < o2.prec) {
          output.push({ op: ops.pop().value });
        } else break;
      }
      ops.push({ type: "op", value: op });
      prevWasValue = false;
    } else if (t.type === "lparen") {
      ops.push(t);
      prevWasValue = false;
    } else if (t.type === "rparen") {
      let found = false;
      while (ops.length) {
        const top = ops.pop();
        if (top.type === "lparen") {
          found = true;
          break;
        }
        output.push(top.type === "unary" ? { type: "unary" } : { op: top.value });
      }
      if (!found) return null;
      drainUnary();
      prevWasValue = true;
    }
  }
  while (ops.length) {
    const top = ops.pop();
    if (top.type === "lparen") return null;
    output.push(top.type === "unary" ? { type: "unary" } : { op: top.value });
  }
  const stack = [];
  for (const item of output) {
    if (typeof item === "number") {
      stack.push(item);
    } else if (item.type === "unary") {
      const a = stack.pop();
      if (a === void 0) return null;
      stack.push(-a);
    } else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === void 0 || b === void 0) return null;
      stack.push(OPERATORS[item.op].apply(a, b));
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) return null;
  return stack[0];
}
function evaluateArithmetic(input) {
  if (!/[-+*/^%×÷]/.test(input)) return null;
  if (!/\d/.test(input)) return null;
  const tokens = tokenizeMath(input);
  if (!tokens || tokens.length === 0) return null;
  return evalMathTokens(tokens);
}
function evaluatePercent(input) {
  const lower = input.toLowerCase();
  const ofMatch = lower.match(/^([\d.,]+)\s*%\s*of\s*([\d.,]+)$/);
  if (ofMatch) {
    const pct = Number(ofMatch[1].replace(/,/g, ""));
    const base = Number(ofMatch[2].replace(/,/g, ""));
    if (Number.isFinite(pct) && Number.isFinite(base)) {
      return { value: pct / 100 * base, note: `${formatNumber(pct)}% of ${formatNumber(base)}` };
    }
  }
  const addMatch = lower.match(/^([\d.,]+)\s*([+-])\s*([\d.,]+)\s*%$/);
  if (addMatch) {
    const base = Number(addMatch[1].replace(/,/g, ""));
    const pct = Number(addMatch[3].replace(/,/g, ""));
    if (Number.isFinite(base) && Number.isFinite(pct)) {
      const delta = pct / 100 * base;
      const value = addMatch[2] === "+" ? base + delta : base - delta;
      return { value, note: `${formatNumber(base)} ${addMatch[2]} ${formatNumber(pct)}%` };
    }
  }
  return null;
}
function evaluateConversion(input, rates) {
  const match = input.toLowerCase().match(/^([\d.,]+)\s*([a-z°]+)\s*(?:to|in|as|=|>)\s*([a-z°]+)$/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  const from = match[2].replace(/°/g, "");
  const to = match[3].replace(/°/g, "");
  if (from === to) return null;
  if (TEMPERATURE_UNITS.has(from) && TEMPERATURE_UNITS.has(to)) {
    const celsius = toCelsius(value, from);
    const out = fromCelsius(celsius, to);
    return { value: out, kind: "temp", formatted: `${formatNumber(out)}\xB0${to[0].toUpperCase()}` };
  }
  const fromCat = categoryOf(from);
  const toCat = categoryOf(to);
  if (fromCat && fromCat === toCat) {
    const table = UNIT_CATEGORIES[fromCat].units;
    const out = value * table[from] / table[to];
    return { value: out, kind: "unit", formatted: `${formatNumber(out)} ${to}` };
  }
  if (from in rates && to in rates) {
    const out = value * rates[to] / rates[from];
    return { value: out, kind: "currency", formatted: `${formatNumber(out)} ${to.toUpperCase()}` };
  }
  return null;
}
function evaluateExpression(rawInput, options = {}) {
  var _a;
  const input = String(rawInput != null ? rawInput : "").trim();
  if (input.length === 0 || input.length > 120) return null;
  const rates = { ...DEFAULT_CURRENCY_RATES, ...(_a = options.rates) != null ? _a : {} };
  const conversion = evaluateConversion(input, rates);
  if (conversion) {
    return {
      ok: true,
      kind: conversion.kind,
      value: conversion.value,
      formatted: conversion.formatted,
      expression: input
    };
  }
  const percent = evaluatePercent(input);
  if (percent) {
    return {
      ok: true,
      kind: "percent",
      value: percent.value,
      formatted: formatNumber(percent.value),
      expression: percent.note
    };
  }
  const arithmetic = evaluateArithmetic(input);
  if (arithmetic !== null) {
    return {
      ok: true,
      kind: "math",
      value: arithmetic,
      formatted: formatNumber(arithmetic),
      expression: input
    };
  }
  return null;
}
function parseCurrencyRates(raw) {
  const rates = { ...DEFAULT_CURRENCY_RATES };
  if (typeof raw !== "string") return rates;
  for (const line of raw.split("\n")) {
    const match = line.match(/^\s*([a-zA-Z]{2,5})\s*[=:]\s*([\d.]+)\s*$/);
    if (!match) continue;
    const value = Number(match[2]);
    if (Number.isFinite(value) && value > 0) rates[match[1].toLowerCase()] = value;
  }
  return rates;
}

// src/core/naturalDates.mjs
var WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
var WEEKDAY_ABBR = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + n);
  return d;
}
function addMonths(date, n) {
  const d = new Date(date.getTime());
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return d;
}
function weekdayIndex(word) {
  var _a;
  const w = word.toLowerCase();
  const full = WEEKDAYS.indexOf(w);
  if (full !== -1) return full;
  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (WEEKDAYS[i].startsWith(w) && w.length >= 3) return i;
  }
  return (_a = WEEKDAY_ABBR[w]) != null ? _a : -1;
}
function labelForDate(date) {
  return `${WEEKDAY_SHORT[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
}
var UNIT_DAYS = { day: 1, days: 1, d: 1, week: 7, weeks: 7, w: 7 };
function parseNaturalDate(rawInput, options = {}) {
  var _a;
  const input = String(rawInput != null ? rawInput : "").trim().toLowerCase();
  if (input.length === 0 || input.length > 40) return null;
  const now = typeof options.now === "number" ? options.now : Date.now();
  const today = startOfDay(now);
  const build = (date, kind) => ({ date: date.getTime(), label: labelForDate(date), kind });
  if (input === "today") return build(today, "relative");
  if (input === "tomorrow" || input === "tmr" || input === "tmrw") return build(addDays(today, 1), "relative");
  if (input === "yesterday") return build(addDays(today, -1), "relative");
  const iso = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const mo = Number(iso[2]);
    const day = Number(iso[3]);
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) {
      const d = new Date(y, mo - 1, day);
      if (d.getMonth() === mo - 1 && d.getDate() === day) return build(d, "iso");
    }
    return null;
  }
  const shorthand = input.match(/^[@+]?(-?\d{1,4})\s*(d|w)$/);
  if (shorthand) {
    const n = Number(shorthand[1]);
    const days = shorthand[2] === "w" ? n * 7 : n;
    return build(addDays(today, days), "relative");
  }
  if (input === "next week") return build(addDays(today, 7), "relative");
  if (input === "last week") return build(addDays(today, -7), "relative");
  if (input === "next month") return build(addMonths(today, 1), "relative");
  if (input === "last month") return build(addMonths(today, -1), "relative");
  const inMatch = input.match(/^in\s+(\d{1,4})\s+(day|days|week|weeks|month|months)$/);
  if (inMatch) {
    const n = Number(inMatch[1]);
    const unit = inMatch[2];
    if (unit.startsWith("month")) return build(addMonths(today, n), "relative");
    return build(addDays(today, n * UNIT_DAYS[unit]), "relative");
  }
  const agoMatch = input.match(/^(\d{1,4})\s+(day|days|week|weeks|month|months)\s+ago$/);
  if (agoMatch) {
    const n = Number(agoMatch[1]);
    const unit = agoMatch[2];
    if (unit.startsWith("month")) return build(addMonths(today, -n), "relative");
    return build(addDays(today, -n * UNIT_DAYS[unit]), "relative");
  }
  const wdMatch = input.match(/^(next|last|this)?\s*([a-z]+)$/);
  if (wdMatch) {
    const word = wdMatch[2];
    const idx = weekdayIndex(word);
    const modifier = (_a = wdMatch[1]) != null ? _a : "";
    if (idx !== -1 && (modifier !== "" || WEEKDAYS.includes(word))) {
      const cur = today.getDay();
      let delta = (idx - cur + 7) % 7;
      if (modifier === "next") {
        delta = delta === 0 ? 7 : delta + 7;
      } else if (modifier === "last") {
        delta = delta === 0 ? -7 : delta - 7;
      } else if (delta === 0) {
        delta = 0;
      }
      return build(addDays(today, delta), "weekday");
    }
  }
  return null;
}

// src/core/capture.mjs
var FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
function headingText(line) {
  const match = line.match(/^(#{1,6})\s+(.*?)\s*$/);
  return match ? { level: match[1].length, text: match[2].toLowerCase() } : null;
}
function fencedLines(lines) {
  const inFence = new Array(lines.length).fill(false);
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].match(/^\s*(```+|~~~+)/);
    if (fence === null && marker) {
      fence = marker[1][0];
      inFence[i] = true;
    } else if (fence !== null) {
      inFence[i] = true;
      if (marker && marker[1][0] === fence) fence = null;
    }
  }
  return inFence;
}
function appendToEnd(existing, text) {
  if (existing.trim().length === 0) return `${text}
`;
  const trimmedEnd = existing.replace(/\s*$/, "");
  return `${trimmedEnd}
${text}
`;
}
function prependToTop(existing, text) {
  const fm = existing.match(FRONTMATTER);
  if (fm) {
    const rest = existing.slice(fm[0].length);
    return `${fm[0]}${text}
${rest.startsWith("\n") ? "" : "\n"}${rest}`;
  }
  return `${text}
${existing.startsWith("\n") ? "" : "\n"}${existing}`;
}
function insertUnderHeading(existing, text, heading) {
  const wanted = heading.replace(/^#+\s*/, "").trim().toLowerCase();
  const lines = existing.split("\n");
  const inFence = fencedLines(lines);
  let headingLine = -1;
  let headingLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    if (inFence[i]) continue;
    const h = headingText(lines[i]);
    if (h && h.text === wanted) {
      headingLine = i;
      headingLevel = h.level;
      break;
    }
  }
  if (headingLine === -1) {
    const withHeading = appendToEnd(existing, `## ${heading.replace(/^#+\s*/, "").trim()}`);
    return appendToEnd(withHeading.replace(/\n$/, ""), text);
  }
  let end = lines.length;
  for (let i = headingLine + 1; i < lines.length; i++) {
    if (inFence[i]) continue;
    const h = headingText(lines[i]);
    if (h && h.level <= headingLevel) {
      end = i;
      break;
    }
  }
  let insertAt = end;
  while (insertAt > headingLine + 1 && lines[insertAt - 1].trim() === "") insertAt--;
  lines.splice(insertAt, 0, text);
  return lines.join("\n").replace(/\s*$/, "") + "\n";
}
function insertCapture(existing, text, options = {}) {
  const base = typeof existing === "string" ? existing : "";
  const line = String(text != null ? text : "").trim();
  if (line.length === 0) return base;
  if (options.heading && options.heading.trim().length > 0) {
    return insertUnderHeading(base, line, options.heading);
  }
  return options.mode === "prepend" ? prependToTop(base, line) : appendToEnd(base, line);
}

// src/core/modalCopy.mjs
function normalizeHeading(heading) {
  return String(heading != null ? heading : "").replace(/^#+\s*/, "").trim();
}
function describeCaptureTarget({ hasText, targetLabel, mode = "append", heading = "" }) {
  if (!hasText) return "Type a note, then press Enter to capture";
  const cleanHeading = normalizeHeading(heading);
  if (cleanHeading) return `Capture under ${cleanHeading} in ${targetLabel}`;
  return `${mode === "prepend" ? "Prepend to" : "Append to"} ${targetLabel}`;
}
function getShortcutHints({ itemKind = null, defaultNewTab = false, isPro = false }) {
  const hints = [
    { keys: ["\u2191", "\u2193"], label: "navigate" },
    { keys: ["Tab"], label: "mode" }
  ];
  const openTarget = defaultNewTab ? "same tab" : "new tab";
  const openLikeKinds = /* @__PURE__ */ new Set(["file", "content", "heading", "symbol", "editor"]);
  const actionPaletteKinds = /* @__PURE__ */ new Set([
    "file",
    "content",
    "heading",
    "symbol",
    "editor",
    "folder",
    "command",
    "collection",
    "profile",
    "workflow",
    "calc",
    "datejump",
    "capture",
    "snippet",
    "create"
  ]);
  if (openLikeKinds.has(itemKind)) {
    hints.splice(
      1,
      0,
      { keys: ["\u21B5"], label: "open" },
      { keys: ["Ctrl", "\u21B5"], label: openTarget },
      { keys: ["Shift", "\u21B5"], label: "new note" }
    );
  } else if (itemKind === "folder") {
    hints.splice(1, 0, { keys: ["\u21B5"], label: "browse" });
  } else if (itemKind === "history") {
    hints.splice(1, 0, { keys: ["\u21B5"], label: "search again" });
  } else if (itemKind === "collection" || itemKind === "profile" || itemKind === "workflow") {
    hints.splice(1, 0, { keys: ["\u21B5"], label: "apply" });
  } else if (itemKind === "action" || itemKind === "command") {
    hints.splice(1, 0, { keys: ["\u21B5"], label: "run" });
  } else if (itemKind === "calc") {
    hints.splice(
      1,
      0,
      { keys: ["\u21B5"], label: "copy" },
      { keys: ["Shift", "\u21B5"], label: "insert" }
    );
  } else if (itemKind === "datejump") {
    hints.splice(1, 0, { keys: ["\u21B5"], label: "open daily note" });
  } else if (itemKind === "capture") {
    hints.splice(1, 0, { keys: ["\u21B5"], label: "capture" });
  } else if (itemKind === "snippet") {
    hints.splice(1, 0, { keys: ["\u21B5"], label: "insert" });
  } else if (itemKind === "create") {
    hints.splice(1, 0, { keys: ["\u21B5"], label: "create note" });
  } else {
    hints.splice(
      1,
      0,
      { keys: ["\u21B5"], label: "open" },
      { keys: ["Ctrl", "\u21B5"], label: openTarget },
      { keys: ["Shift", "\u21B5"], label: "new note" }
    );
  }
  if (itemKind && actionPaletteKinds.has(itemKind) && itemKind !== "history" && itemKind !== "action" && itemKind !== "create") {
    hints.splice(hints.length - 1, 0, { keys: ["Ctrl", "K"], label: "actions" });
  }
  if (isPro && itemKind === "file") {
    hints.splice(
      hints.length - 1,
      0,
      { keys: ["Ctrl", "D"], label: "star" },
      { keys: ["Ctrl", "Space"], label: "select" }
    );
  }
  return hints;
}

// src/spotlight/resultTypes.ts
var MODE_ORDER = [
  "files",
  "content",
  "headings",
  "symbols",
  "commands",
  "links",
  "editors",
  "folders",
  "capture",
  "snippets"
];
function itemFile(item) {
  if (item.kind === "file" || item.kind === "content" || item.kind === "heading" || item.kind === "symbol") {
    return item.file;
  }
  if (item.kind === "editor") return item.file;
  return null;
}
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// src/spotlight/PreviewPane.ts
var import_obsidian6 = require("obsidian");
var PreviewPane = class {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.component = null;
    this.timer = null;
    // Bumped on every update() so a slower async read from an earlier selection
    // can't render into the pane after a newer selection replaced it.
    this.token = 0;
  }
  mount(parent) {
    this.el = parent.createDiv({ cls: "vault-spotlight-preview" });
    this.component = new import_obsidian6.Component();
    this.component.load();
  }
  get isMounted() {
    return this.el !== null && this.component !== null;
  }
  /** Debounced: render `file` (markdown only) and highlight/scroll to `terms`. */
  update(file, terms) {
    if (!this.el || !this.component) return;
    if (this.timer !== null) window.clearTimeout(this.timer);
    const previewEl = this.el;
    const component = this.component;
    const token = ++this.token;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      previewEl.empty();
      if (!file) {
        previewEl.createDiv({ cls: "vault-spotlight-preview-empty", text: "No preview" });
        return;
      }
      if (file.extension !== "md") {
        previewEl.createDiv({
          cls: "vault-spotlight-preview-empty",
          text: `${file.extension.toUpperCase()} file \u2014 no preview`
        });
        return;
      }
      previewEl.createDiv({ cls: "vault-spotlight-preview-title", text: file.basename });
      const bodyEl = previewEl.createDiv({ cls: "vault-spotlight-preview-body markdown-rendered" });
      void this.app.vault.cachedRead(file).then((content) => {
        if (this.token !== token || this.component !== component || !previewEl.isConnected) return;
        return import_obsidian6.MarkdownRenderer.render(this.app, content.slice(0, 1e4), bodyEl, file.path, component);
      }).then(() => {
        if (this.token !== token || this.component !== component || !bodyEl.isConnected) return;
        const hit = highlightFirstMatch(bodyEl, terms);
        hit == null ? void 0 : hit.scrollIntoView({ block: "center" });
      }).catch(() => {
        if (this.token !== token || !previewEl.isConnected) return;
        previewEl.empty();
        previewEl.createDiv({ cls: "vault-spotlight-preview-empty", text: "Preview unavailable" });
      });
    }, 120);
  }
  unload() {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.component) {
      this.component.unload();
      this.component = null;
    }
    this.el = null;
  }
};
function highlightFirstMatch(root, terms) {
  var _a;
  const needles = terms.map((t) => t.toLowerCase()).filter((t) => t.length > 0);
  if (needles.length === 0) return null;
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while (node = walker.nextNode()) {
    const text = (_a = node.nodeValue) != null ? _a : "";
    if (!text.trim()) continue;
    const low = text.toLowerCase();
    let idx = -1;
    let len = 0;
    for (const needle of needles) {
      const at = low.indexOf(needle);
      if (at !== -1 && (idx === -1 || at < idx)) {
        idx = at;
        len = needle.length;
      }
    }
    if (idx === -1) continue;
    const range = doc.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + len);
    const mark = doc.createElement("mark");
    mark.className = "vault-spotlight-preview-hit";
    try {
      range.surroundContents(mark);
      return mark;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// src/spotlight/resultRow.ts
var import_obsidian7 = require("obsidian");

// src/core/resultDecorators.mjs
function buildFileDecorations({
  parentPath,
  modifiedLabel,
  fileKind,
  isStarred,
  isBookmarked,
  isRecent,
  primaryMatch,
  aliasMatched,
  tags,
  aliases
}) {
  const badges = [];
  if (isStarred) badges.push("Starred");
  if (isBookmarked) badges.push("Bookmarked");
  if (isRecent) badges.push("Recent");
  if (fileKind && fileKind !== "note") badges.push(String(fileKind).toUpperCase());
  const meta = [parentPath, modifiedLabel].filter(Boolean).concat((Array.isArray(tags) ? tags : []).slice(0, 2).map((tag) => `#${String(tag).replace(/^#/, "")}`)).concat((Array.isArray(aliases) ? aliases : []).slice(0, 1).map((alias) => `aka ${alias}`)).join(" \xB7 ");
  const reason = reasonLabel(primaryMatch, aliasMatched);
  return { badges, meta, reason };
}
function reasonLabel(primaryMatch, aliasMatched = false) {
  if (aliasMatched || primaryMatch === "alias") return "Matched alias";
  if (primaryMatch === "path") return "Matched path";
  if (primaryMatch === "filters") return "Matched filters";
  if (primaryMatch === "browse") return "Browse ranking";
  return "Matched filename";
}

// src/spotlight/resultRow.ts
function renderResultRow(row, item, options) {
  var _a;
  const iconWrap = row.createDiv({ cls: "vault-spotlight-item-icon-wrap" });
  const body = row.createDiv({ cls: "vault-spotlight-item-body" });
  const titleRow = body.createDiv({ cls: "vault-spotlight-item-title-row" });
  const title = titleRow.createDiv({ cls: "vault-spotlight-item-title" });
  if (item.kind === "file") {
    (0, import_obsidian7.setIcon)(iconWrap, iconForFileKind(item.fileKind));
    row.toggleClass("is-starred", item.isStarred);
    renderHighlightedText(title, item.file.basename, item.matchIndices);
    const decorations = buildFileDecorations({
      parentPath: ((_a = item.file.parent) == null ? void 0 : _a.path) || "/",
      modifiedLabel: options.showModifiedTime ? item.modifiedLabel : "",
      fileKind: item.fileKind === "markdown" ? "note" : item.fileKind,
      isStarred: item.isStarred && !options.isEmptyQuery,
      isBookmarked: item.isBookmarked && !options.isEmptyQuery,
      isRecent: item.isRecent && !options.isEmptyQuery,
      primaryMatch: item.primaryMatch,
      aliasMatched: item.aliasMatched,
      tags: item.tags,
      aliases: item.aliases
    });
    for (const badge of decorations.badges) {
      titleRow.createSpan({
        cls: badge === "Starred" ? "vault-spotlight-item-badge is-star" : "vault-spotlight-item-badge",
        text: badge
      });
    }
    if (options.showMatchReasons && !options.isEmptyQuery) {
      titleRow.createSpan({ cls: "vault-spotlight-item-badge is-type", text: decorations.reason });
    }
    body.createDiv({ cls: "vault-spotlight-item-meta", text: decorations.meta });
  } else if (item.kind === "content") {
    (0, import_obsidian7.setIcon)(
      iconWrap,
      item.file.extension === "canvas" ? "layout-dashboard" : item.file.extension === "base" ? "database" : "text"
    );
    title.setText(item.file.basename);
    const engineLabel = item.engine === "ripgrep" ? "Ripgrep" : item.engine === "canvas" ? "Canvas" : item.engine === "base" ? "Base" : "Match";
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: `${engineLabel} \xB7 L${item.line}` });
    body.createDiv({ cls: "vault-spotlight-item-snippet", text: item.snippet });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file.path });
  } else if (item.kind === "heading") {
    (0, import_obsidian7.setIcon)(iconWrap, "heading");
    renderHighlightedText(title, item.heading, item.matchIndices);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: `H${item.level}` });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.file.basename} \xB7 L${item.line}` });
  } else if (item.kind === "command") {
    (0, import_obsidian7.setIcon)(iconWrap, "terminal-square");
    renderHighlightedText(title, item.name, item.matchIndices);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.isRecent ? "Recent" : "Command" });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: "Run command" });
  } else if (item.kind === "symbol") {
    (0, import_obsidian7.setIcon)(iconWrap, iconForSymbolType(item.symbolType));
    if (item.symbolType === "heading" && item.level > 1) {
      row.addClass(`vault-spotlight-indent-${Math.min(item.level, 6)}`);
    }
    renderHighlightedText(title, item.text, item.matchIndices);
    titleRow.createSpan({
      cls: "vault-spotlight-item-badge",
      text: item.symbolType === "heading" ? `H${item.level}` : capitalize(item.symbolType)
    });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: `L${item.line}` });
  } else if (item.kind === "editor") {
    (0, import_obsidian7.setIcon)(iconWrap, item.file ? iconForFileKind(getVaultFileKind(item.file)) : "layout");
    renderHighlightedText(title, item.title, item.matchIndices);
    if (item.isActive) {
      titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "Active" });
    } else if (item.isPinned) {
      titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Pinned" });
    }
    if (item.viewType && item.viewType !== "markdown") {
      titleRow.createSpan({ cls: "vault-spotlight-item-badge is-type", text: item.viewType.toUpperCase() });
    }
    body.createDiv({ cls: "vault-spotlight-item-meta", text: item.file ? item.file.path : "Open editor" });
  } else if (item.kind === "folder") {
    (0, import_obsidian7.setIcon)(iconWrap, "folder");
    renderHighlightedText(title, item.folder.name, item.matchIndices);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Folder" });
    body.createDiv({
      cls: "vault-spotlight-item-meta",
      text: `${item.folder.path} \xB7 ${item.folder.children.length} item${item.folder.children.length === 1 ? "" : "s"}`
    });
  } else if (item.kind === "history") {
    (0, import_obsidian7.setIcon)(iconWrap, "history");
    title.setText(item.query);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Recent search" });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: "Press \u21B5 to search again" });
  } else if (item.kind === "collection") {
    (0, import_obsidian7.setIcon)(iconWrap, item.isPinned ? "star" : "search");
    title.setText(item.name);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.isPinned ? "Pinned collection" : "Smart collection" });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: item.query });
  } else if (item.kind === "profile") {
    (0, import_obsidian7.setIcon)(iconWrap, item.isActive ? "check-circle" : "sliders-horizontal");
    title.setText(item.name);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.isActive ? "Active profile" : "Search profile" });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.defaultMode}${item.defaultQuery ? ` \xB7 ${item.defaultQuery}` : ""}` });
  } else if (item.kind === "workflow") {
    (0, import_obsidian7.setIcon)(iconWrap, item.isPinned ? "sparkles" : "play-circle");
    title.setText(item.name);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.isStarter ? "Starter workflow" : "Workflow" });
    if (item.rankingMode) {
      titleRow.createSpan({ cls: "vault-spotlight-item-badge is-type", text: item.rankingMode });
    }
    body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.mode}${item.query ? ` \xB7 ${item.query}` : ""}` });
  } else if (item.kind === "action") {
    (0, import_obsidian7.setIcon)(iconWrap, item.action.requiresPro ? "sparkles" : "bolt");
    title.setText(item.action.name);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.action.requiresPro ? "Pro action" : "Action" });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: item.action.description });
  } else if (item.kind === "calc") {
    row.addClass("is-calc");
    (0, import_obsidian7.setIcon)(iconWrap, "calculator");
    title.addClass("vault-spotlight-calc-result");
    title.setText(item.result);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "\u21B5 Copy" });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: `${item.expression} \xB7 ${item.detail}` });
  } else if (item.kind === "datejump") {
    (0, import_obsidian7.setIcon)(iconWrap, "calendar-days");
    title.setText(item.label);
    titleRow.createSpan({
      cls: item.exists ? "vault-spotlight-item-badge" : "vault-spotlight-item-badge is-star",
      text: item.exists ? "Daily note" : "Create daily note"
    });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: item.path });
  } else if (item.kind === "capture") {
    (0, import_obsidian7.setIcon)(iconWrap, "plus-circle");
    title.setText(item.text || "Type something to capture\u2026");
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: item.label });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: item.description });
  } else if (item.kind === "snippet") {
    (0, import_obsidian7.setIcon)(iconWrap, "clipboard-type");
    renderHighlightedText(title, item.name, item.matchIndices);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge", text: "Snippet" });
    body.createDiv({ cls: "vault-spotlight-item-snippet", text: item.body.replace(/\s+/g, " ").slice(0, 120) });
  } else {
    (0, import_obsidian7.setIcon)(iconWrap, "file-plus");
    title.setText(`Create \u201C${item.name}\u201D`);
    titleRow.createSpan({ cls: "vault-spotlight-item-badge is-star", text: "New" });
    body.createDiv({ cls: "vault-spotlight-item-meta", text: "Create a new note" });
  }
}

// src/spotlight/batchOps.ts
var import_obsidian8 = require("obsidian");

// src/core/frontmatterTags.mjs
function normalizeTag2(raw) {
  return String(raw != null ? raw : "").replace(/^#/, "").trim().replace(/\s+/g, "-");
}
function tagsValueToList(value) {
  if (value === null || value === void 0) return [];
  const entries = Array.isArray(value) ? value : String(value).split(",");
  return entries.map((entry) => normalizeTag2(entry)).filter(Boolean);
}
function addTagToTags(value, rawTag) {
  const tag = normalizeTag2(rawTag);
  const list = tagsValueToList(value);
  if (!tag || list.some((entry) => entry.toLowerCase() === tag.toLowerCase())) return list;
  return [...list, tag];
}
function removeTagFromTags(value, rawTag) {
  const tag = normalizeTag2(rawTag).toLowerCase();
  const list = tagsValueToList(value).filter((entry) => entry.toLowerCase() !== tag);
  return list.length > 0 ? list : null;
}
function removeInlineTag(markdown, rawTag) {
  const tag = normalizeTag2(rawTag);
  if (!tag) return markdown;
  return String(markdown != null ? markdown : "").replace(new RegExp(`(^|\\s)#${escapeRegExp(tag)}(?=\\s|$)`, "g"), (m, lead) => lead || "").replace(/[ \t]+\n/g, "\n");
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/core/resultMarkdown.mjs
function buildResultMarkdown(rows) {
  return rows.map((row) => {
    var _a, _b;
    return `${(_a = row.prefix) != null ? _a : "- "}${row.link}${(_b = row.suffix) != null ? _b : ""}`;
  }).filter((line) => line.trim().length > 0).join("\n");
}
function buildMocMarkdown(rows, options = {}) {
  const title = options.title || "Vault Spotlight MOC";
  const groupBy = options.groupBy || "none";
  const includeSnippets = options.includeSnippets === true;
  const groups = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = groupKey(row, groupBy);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const lines = [`# ${title}`, ""];
  for (const [group, items] of groups) {
    if (groupBy !== "none") lines.push(`## ${group}`, "");
    for (const row of items) {
      const suffix = includeSnippets && row.snippet ? ` \u2014 ${row.snippet}` : row.suffix || "";
      lines.push(`- ${row.link}${suffix}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}
function groupKey(row, groupBy) {
  var _a;
  if (groupBy === "folder") return row.folder || "/";
  if (groupBy === "tag") return ((_a = row.tags) == null ? void 0 : _a[0]) || "Untagged";
  if (groupBy === "property") return row.property || "Uncategorized";
  return "Results";
}

// src/spotlight/batchOps.ts
function filesForBatch(ctx) {
  return ctx.resultItems().map((item) => itemFile(item)).filter((file) => !!file);
}
async function runBatch(files, op, verb, noun = "note") {
  const outcomes = await Promise.allSettled(files.map((file) => op(file)));
  const failed = outcomes.filter((o) => o.status === "rejected").length;
  const ok = outcomes.length - failed;
  const plural = ok === 1 ? "" : "s";
  const base = `Vault Spotlight: ${verb} ${ok} ${noun}${plural}`;
  new import_obsidian8.Notice(failed > 0 ? `${base} (${failed} failed).` : `${base}.`);
  if (failed > 0) {
    console.error(`[VaultSpotlight] ${verb}: ${failed} of ${outcomes.length} file(s) failed.`);
  }
}
function markdownFilesForBatch(ctx) {
  return filesForBatch(ctx).filter((file) => file.extension === "md");
}
function resultsAsMarkdown(ctx) {
  const rows = ctx.resultItems().map((item) => {
    const file = itemFile(item);
    if (!file) return null;
    let suffix = "";
    if (item.kind === "content") suffix = ` \u2014 L${item.line}: ${item.snippet}`;
    else if (item.kind === "heading") suffix = ` \u2014 ${"#".repeat(item.level)} ${item.heading}`;
    return { link: ctx.app.fileManager.generateMarkdownLink(file, ""), suffix };
  }).filter(Boolean);
  return buildResultMarkdown(rows);
}
function copyResultsAsMarkdown(ctx) {
  const markdown = resultsAsMarkdown(ctx);
  if (!markdown) {
    new import_obsidian8.Notice("Vault Spotlight: no results to copy.");
    return;
  }
  copyToClipboard(markdown, "Results copied");
}
async function exportResultsToNote(ctx) {
  const markdown = resultsAsMarkdown(ctx);
  if (!markdown) {
    new import_obsidian8.Notice("Vault Spotlight: no results to export.");
    return;
  }
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ").replace(":", "-");
  const note = `# Vault Spotlight search results

Query: ${ctx.exportQuery() || "Browse"}

${markdown}
`;
  await createExportNote(ctx, `Search results ${stamp}.md`, note, "results exported");
}
function batchAddTag(ctx) {
  const files = markdownFilesForBatch(ctx);
  if (files.length === 0) {
    new import_obsidian8.Notice("Vault Spotlight: select Markdown notes first.");
    return;
  }
  new PromptModal(ctx.app, {
    title: "Add tag to selected notes",
    initial: "spotlight",
    cta: "Add tag",
    onSubmit: (raw) => {
      const cleaned = normalizeTag2(raw);
      if (!cleaned) return;
      void runBatch(
        files,
        async (file) => {
          const cache = ctx.app.metadataCache.getFileCache(file);
          const existing = cache ? collectFileTags(cache) : /* @__PURE__ */ new Set();
          if (existing.has(cleaned.toLowerCase())) return;
          await ctx.app.fileManager.processFrontMatter(file, (fm) => {
            fm.tags = addTagToTags(fm.tags, cleaned);
          });
        },
        "tag added to"
      );
    }
  }).open();
}
function batchRemoveTag(ctx) {
  const files = markdownFilesForBatch(ctx);
  if (files.length === 0) {
    new import_obsidian8.Notice("Vault Spotlight: select Markdown notes first.");
    return;
  }
  new PromptModal(ctx.app, {
    title: "Remove tag from selected notes",
    initial: "spotlight",
    cta: "Remove tag",
    onSubmit: (raw) => {
      const cleaned = normalizeTag2(raw);
      if (!cleaned) return;
      void runBatch(
        files,
        async (file) => {
          await ctx.app.fileManager.processFrontMatter(file, (fm) => {
            const next = removeTagFromTags(fm.tags, cleaned);
            if (next === null) delete fm.tags;
            else fm.tags = next;
          });
          await ctx.app.vault.process(file, (content) => removeInlineTag(content, cleaned));
        },
        "tag removed from"
      );
    }
  }).open();
}
function batchSetProperty(ctx) {
  const files = markdownFilesForBatch(ctx);
  if (files.length === 0) {
    new import_obsidian8.Notice("Vault Spotlight: select Markdown notes first.");
    return;
  }
  new PromptModal(ctx.app, {
    title: "Set property on selected notes",
    initial: "status=active",
    cta: "Set property",
    onSubmit: (raw) => {
      const sep = raw.indexOf("=");
      if (sep <= 0) {
        new import_obsidian8.Notice("Vault Spotlight: use key=value.");
        return;
      }
      const key = raw.slice(0, sep).trim();
      const value = raw.slice(sep + 1).trim();
      if (!key) return;
      void runBatch(
        files,
        (file) => ctx.app.fileManager.processFrontMatter(file, (fm) => {
          var _a;
          const existingKey = (_a = Object.keys(fm).find((k) => k.toLowerCase() === key.toLowerCase())) != null ? _a : key;
          fm[existingKey] = value;
        }),
        "property set on"
      );
    }
  }).open();
}
function batchMoveFiles(ctx) {
  const files = filesForBatch(ctx);
  if (files.length === 0) return;
  new PromptModal(ctx.app, {
    title: "Move selected files to folder",
    initial: "Archive",
    cta: "Move files",
    onSubmit: (raw) => {
      const folder = (0, import_obsidian8.normalizePath)(raw.trim());
      if (!folder) return;
      void (async () => {
        try {
          if (!ctx.app.vault.getAbstractFileByPath(folder)) await ctx.app.vault.createFolder(folder);
        } catch (err) {
          console.error("[VaultSpotlight] move: could not create target folder", err);
          new import_obsidian8.Notice("Vault Spotlight: could not create the target folder.");
          return;
        }
        let moved = 0;
        let failed = 0;
        for (const file of files) {
          try {
            await ctx.app.fileManager.renameFile(file, (0, import_obsidian8.normalizePath)(`${folder}/${file.name}`));
            moved++;
          } catch (err) {
            failed++;
            console.error("[VaultSpotlight] move failed", file.path, err);
          }
        }
        const plural = moved === 1 ? "" : "s";
        const base = `Vault Spotlight: moved ${moved} file${plural}`;
        new import_obsidian8.Notice(failed > 0 ? `${base} (${failed} failed).` : `${base}.`);
      })();
    }
  }).open();
}
function batchSetStarred(ctx, starred) {
  const files = filesForBatch(ctx);
  for (const file of files) {
    const isStarred = ctx.plugin.isStarred(file.path);
    if (starred !== isStarred) ctx.plugin.toggleStar(file.path);
  }
  new import_obsidian8.Notice(`Vault Spotlight: ${starred ? "starred" : "unstarred"} ${files.length} file${files.length === 1 ? "" : "s"}.`);
  ctx.runSearch();
}
function createMocFromResults(ctx) {
  const rows = ctx.resultItems().map((item) => {
    var _a;
    const file = itemFile(item);
    if (!file) return null;
    return {
      link: ctx.app.fileManager.generateMarkdownLink(file, ""),
      folder: ((_a = file.parent) == null ? void 0 : _a.path) || "/",
      snippet: item.kind === "content" ? item.snippet : item.kind === "heading" ? item.heading : ""
    };
  }).filter(Boolean);
  if (rows.length === 0) return;
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const note = buildMocMarkdown(rows, { title: `Vault Spotlight MOC ${stamp}`, groupBy: "folder", includeSnippets: true });
  void createExportNote(ctx, `MOC ${stamp}.md`, note, "MOC created");
}
function appendLinksToActiveNote(ctx) {
  const active = ctx.app.workspace.getActiveFile();
  if (!active || active.extension !== "md") {
    new import_obsidian8.Notice("Vault Spotlight: open a Markdown note first.");
    return;
  }
  const markdown = resultsAsMarkdown(ctx);
  if (!markdown) return;
  void ctx.app.vault.process(active, (content) => `${content.trimEnd()}

${markdown}
`).then(() => new import_obsidian8.Notice("Vault Spotlight: links appended."));
}
async function createExportNote(ctx, filename, note, message) {
  const dir = "Vault Spotlight Exports";
  if (!ctx.app.vault.getAbstractFileByPath(dir)) await ctx.app.vault.createFolder(dir);
  let path = (0, import_obsidian8.normalizePath)(`${dir}/${filename}`);
  let counter2 = 2;
  while (ctx.app.vault.getAbstractFileByPath(path)) {
    path = (0, import_obsidian8.normalizePath)(`${dir}/${filename.replace(/\.md$/, ` ${counter2}.md`)}`);
    counter2++;
  }
  const file = await ctx.app.vault.create(path, note);
  ctx.close();
  await ctx.app.workspace.getLeaf(false).openFile(file);
  new import_obsidian8.Notice(`Vault Spotlight: ${message}.`);
}
function copyToClipboard(text, okMessage) {
  const clip = navigator.clipboard;
  if (clip == null ? void 0 : clip.writeText) {
    void clip.writeText(text).then(
      () => new import_obsidian8.Notice(`Vault Spotlight: ${okMessage}`),
      () => new import_obsidian8.Notice("Vault Spotlight: copy failed")
    );
  } else {
    new import_obsidian8.Notice("Vault Spotlight: clipboard unavailable");
  }
}
function renameFile(app, file) {
  new PromptModal(app, {
    title: "Rename note",
    initial: file.basename,
    cta: "Rename",
    onSubmit: (name) => {
      var _a;
      const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim();
      if (!cleaned || cleaned === file.basename) return;
      const dir = ((_a = file.parent) == null ? void 0 : _a.path) ? `${file.parent.path}/` : "";
      const newPath = (0, import_obsidian8.normalizePath)(`${dir}${cleaned}.${file.extension}`);
      void app.fileManager.renameFile(file, newPath).catch((err) => {
        console.error("[VaultSpotlight] rename failed", err);
        new import_obsidian8.Notice("Vault Spotlight: rename failed (name may already exist).");
      });
    }
  }).open();
}

// src/spotlight/SpotlightModal.ts
var SpotlightModal = class extends import_obsidian9.Modal {
  constructor(app, plugin, initialQuery = "", initialMode = "files") {
    super(app);
    this.plugin = plugin;
    this.items = [];
    this.selectedIndex = 0;
    this.checkedPaths = /* @__PURE__ */ new Set();
    this.searchTimer = null;
    this.loadingTimer = null;
    this.searchGeneration = 0;
    this.isLoading = false;
    this.metadataRef = null;
    this.actionContext = null;
    this.actionReturnQuery = "";
    this.actionReturnMode = "files";
    this.resultSnapshot = [];
    // Drill-in: arrow onto a result, then type the symbols/links trigger to
    // explore that file without opening it. Escape restores the outer search.
    this.drillFile = null;
    this.drillReturnQuery = "";
    this.drillReturnMode = "files";
    this.hasNavigated = false;
    this.activeWorkflowId = "";
    this.focusTimers = [];
    this.shouldRestoreSelection = false;
    this.preview = new PreviewPane(app);
    this.fileSearcher = new FileSearcher(app);
    this.headingSearcher = new HeadingSearcher(app);
    this.commandSearcher = new CommandSearcher(app);
    this.symbolSearcher = new SymbolSearcher(app);
    this.editorSearcher = new EditorSearcher(app);
    this.initialQuery = initialQuery;
    this.mode = initialMode;
  }
  onOpen() {
    this.containerEl.addClass("vault-spotlight-container");
    this.titleEl.empty();
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("vault-spotlight-modal");
    const header = contentEl.createDiv({ cls: "vault-spotlight-header" });
    const titleRow = header.createDiv({ cls: "vault-spotlight-title-row" });
    titleRow.createDiv({ cls: "vault-spotlight-title", text: "Vault Spotlight" });
    this.modeBadgeEl = titleRow.createSpan({ cls: "vault-spotlight-mode-badge", text: "Files" });
    const inputWrap = header.createDiv({ cls: "vault-spotlight-input-wrap" });
    const searchIcon = inputWrap.createSpan({ cls: "vault-spotlight-search-icon" });
    (0, import_obsidian9.setIcon)(searchIcon, "search");
    this.inputEl = inputWrap.createEl("input", {
      type: "text",
      placeholder: "Search notes, tags, or properties\u2026",
      attr: {
        spellcheck: "false",
        autocomplete: "off",
        autofocus: "true",
        role: "combobox",
        "aria-expanded": "true",
        "aria-autocomplete": "list",
        "aria-controls": "vault-spotlight-listbox",
        "aria-label": "Vault Spotlight search"
      }
    });
    this.inputEl.value = this.initialQuery;
    this.hintEl = header.createDiv({ cls: "vault-spotlight-hint" });
    this.updateHint();
    const body = contentEl.createDiv({ cls: "vault-spotlight-body" });
    this.resultsEl = body.createDiv({
      cls: "vault-spotlight-results",
      attr: { role: "listbox", id: "vault-spotlight-listbox", "aria-label": "Search results" }
    });
    this.renderLoading();
    if (this.previewEnabled()) {
      this.preview.mount(body);
      this.containerEl.addClass("has-preview");
    }
    this.footerEl = contentEl.createDiv({ cls: "vault-spotlight-footer" });
    this.renderFooter();
    if (!this.plugin.settings.isPro) {
      const cta = contentEl.createDiv({ cls: "vault-spotlight-pro-cta" });
      cta.createDiv({
        cls: "vault-spotlight-pro-cta-text",
        text: "Unlock ripgrep search, starred pins, canvas/PDF, batch open, and more."
      });
      const link = cta.createEl("a", {
        cls: "vault-spotlight-pro-btn",
        text: "Get Pro on Buy Me a Coffee",
        href: safeHttpUrl(this.plugin.settings.purchaseUrl, DEFAULT_SETTINGS.purchaseUrl)
      });
      link.setAttr("target", "_blank");
      link.setAttr("rel", "noopener noreferrer");
    }
    this.inputEl.addEventListener("input", () => {
      this.hasNavigated = false;
      this.activeWorkflowId = "";
      this.scheduleSearch();
    });
    this.inputEl.addEventListener("keydown", (evt) => {
      if (!this.hasNavigated || evt.ctrlKey || evt.metaKey || evt.altKey) return;
      const prefixes = this.plugin.settings.modePrefixes;
      const drillMode = evt.key === prefixes.symbols[0] ? "symbols" : evt.key === prefixes.links[0] ? "links" : null;
      if (!drillMode) return;
      const item = this.items[this.selectedIndex];
      const file = item ? itemFile(item) : null;
      if (!file || file.extension !== "md") return;
      evt.preventDefault();
      this.drillInto(file, drillMode);
    });
    this.registerScopeShortcuts();
    this.metadataRef = this.app.metadataCache.on("resolved", () => {
      if (this.hasMetadataFilters()) this.scheduleSearch();
    });
    this.focusInput();
    void this.runSearch().then(() => this.focusInput());
  }
  onClose() {
    if (this.metadataRef) {
      this.app.metadataCache.offref(this.metadataRef);
      this.metadataRef = null;
    }
    this.searchGeneration++;
    if (this.searchTimer !== null) {
      window.clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
    if (this.loadingTimer !== null) {
      window.clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    this.clearFocusTimers();
    this.preview.unload();
    this.plugin.onSpotlightClosed(this);
    this.containerEl.removeClass("vault-spotlight-container");
    this.containerEl.removeClass("has-preview");
    this.contentEl.empty();
  }
  previewEnabled() {
    var _a;
    const profile = this.currentProfile();
    return this.plugin.settings.isPro && ((_a = profile == null ? void 0 : profile.showPreview) != null ? _a : this.plugin.settings.showPreview);
  }
  currentProfile() {
    if (!this.plugin.settings.isPro) return null;
    return activeProfile(this.plugin.settings.searchProfiles, this.plugin.settings.activeProfileId);
  }
  currentWorkflow() {
    var _a;
    return (_a = this.plugin.settings.workflowPresets.find((workflow) => workflow.id === this.activeWorkflowId)) != null ? _a : null;
  }
  /**
   * Trigger cheatsheet: every mode prefix stays visible in the modal so the
   * mode system is discoverable without reading docs (the top complaint
   * about comparable switcher plugins).
   */
  updateHint() {
    const isPro = this.plugin.settings.isPro;
    const prefixes = this.plugin.settings.modePrefixes;
    this.hintEl.empty();
    const hints = [
      ["2+2", "calc"],
      [prefixes.capture, "capture"],
      ["#journal", "tag"],
      [prefixes.commands, "commands"],
      [prefixes.symbols, "outline"],
      [prefixes.editors, "tabs"],
      [prefixes.folders, "folders"],
      [prefixes.content, "content"],
      [prefixes.headings, "headings"],
      [prefixes.links, "links"],
      [prefixes.snippets, "snippets"],
      ["Tab", "cycle"],
      [this.plugin.settings.escapeChar, "literal"]
    ];
    hints.forEach(([code, label], index) => {
      if (index > 0) this.hintEl.appendText(" \xB7 ");
      this.hintEl.createEl("code", { text: code });
      this.hintEl.appendText(` ${label}`);
    });
    if (isPro) {
      this.hintEl.appendText(" \xB7 ");
      this.hintEl.createEl("code", { text: "Ctrl+D" });
      this.hintEl.appendText(" star");
    }
    if (this.plugin.settings.workflowPresets.length === 0) {
      this.hintEl.appendText(" \xB7 starter workflows in Browse");
    }
  }
  hasMetadataFilters() {
    var _a, _b;
    const parsed = tokenizeQuery((_b = (_a = this.inputEl) == null ? void 0 : _a.value) != null ? _b : "");
    return parsed.tags.length > 0 || parsed.properties.length > 0;
  }
  expandAliases(raw) {
    if (!this.plugin.settings.isPro || !this.plugin.settings.searchAliases.trim()) return raw;
    const parts = raw.trim().split(/\s+/);
    if (parts.length === 0) return raw;
    const first = parts[0].toLowerCase();
    for (const line of this.plugin.settings.searchAliases.split("\n")) {
      const match = line.match(/^\s*([^=]+?)\s*=\s*(.+)$/);
      if (!match) continue;
      if (match[1].trim().toLowerCase() === first) return [match[2].trim(), ...parts.slice(1)].join(" ");
    }
    return raw;
  }
  scheduleSearch() {
    if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => void this.runSearch(), 60);
  }
  /**
   * Leading prefixes always win over the Tab-toggled mode, so they stay
   * discoverable (all customizable): ">" content, ":" commands, "^" headings,
   * "$" symbols, "~" links, "=" editors, "/" folders. The escape character
   * ("!") forces a literal files search.
   */
  resolveQuery(raw) {
    const detected = detectModeFromPrefix(
      raw,
      this.plugin.settings.modePrefixes,
      this.plugin.settings.escapeChar
    );
    if (detected.escaped) return { mode: "files", body: detected.body };
    if (detected.mode) return { mode: detected.mode, body: detected.body };
    return { mode: this.mode, body: raw.trim() };
  }
  async runSearch() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const generation = ++this.searchGeneration;
    const raw = this.expandAliases(this.inputEl.value);
    const trimmed = raw.trim();
    const { mode, body } = this.resolveQuery(raw);
    const isEmptyQuery = body.length === 0;
    const isPro = this.plugin.settings.isPro;
    const profile = this.currentProfile();
    const workflow = this.currentWorkflow();
    const excludeFolders = (_a = profile == null ? void 0 : profile.excludeFolders) != null ? _a : this.plugin.settings.excludeFolders;
    const includeCanvas = (_b = profile == null ? void 0 : profile.includeCanvas) != null ? _b : this.plugin.settings.includeCanvas;
    const includePdf = (_c = profile == null ? void 0 : profile.includePdf) != null ? _c : this.plugin.settings.includePdf;
    const includeBases = (_d = profile == null ? void 0 : profile.includeBases) != null ? _d : this.plugin.settings.includeBases;
    this.isLoading = true;
    if (this.loadingTimer !== null) window.clearTimeout(this.loadingTimer);
    this.loadingTimer = window.setTimeout(() => {
      this.loadingTimer = null;
      if (this.isLoading) this.renderLoading();
    }, 100);
    if (this.actionContext) {
      const actions = this.availableActions(this.actionContext);
      const query = trimmed.toLowerCase();
      this.setBadge("Actions", "is-content");
      this.items = actions.filter((action) => !query || `${action.name} ${action.description}`.toLowerCase().includes(query)).map((action) => ({ kind: "action", action }));
      this.isLoading = false;
      this.selectedIndex = 0;
      this.renderResults();
      this.updateStatus(this.items.length);
      return;
    }
    try {
      if ((mode === "content" || mode === "headings" || mode === "links" || mode === "snippets") && !isPro) {
        this.setBadge("Pro", "is-pro");
        this.items = [];
        this.isLoading = false;
        this.renderEmptyState(
          "lock",
          mode === "content" ? "Content search is a Pro feature" : mode === "headings" ? "Heading jump is a Pro feature" : mode === "snippets" ? "Snippets are a Pro feature" : "Links mode is a Pro feature",
          mode === "content" ? "Search inside note bodies with queries like > meeting notes." : mode === "headings" ? "Jump straight to any heading across your vault." : mode === "snippets" ? "Insert reusable text snippets with date, time, clipboard, and cursor placeholders." : "Browse backlinks and outlinks for the active note or a matching note."
        );
        this.updateStatus(0);
        return;
      }
      if (mode === "commands") {
        const cmdQuery = body;
        this.setBadge("Commands", "is-content");
        const commandResults = this.commandSearcher.search(cmdQuery, cmdQuery ? 60 : 1e3);
        if (generation !== this.searchGeneration) return;
        let ordered = commandResults;
        const recentIds = this.plugin.settings.recentCommandIds;
        if (cmdQuery.length === 0 && recentIds.length > 0) {
          const byId = new Map(commandResults.map((r) => [r.id, r]));
          const recent = recentIds.map((id) => byId.get(id)).filter((r) => !!r);
          const recentSet2 = new Set(recent.map((r) => r.id));
          ordered = [...recent, ...commandResults.filter((r) => !recentSet2.has(r.id))];
        }
        const recentSet = new Set(cmdQuery.length === 0 ? recentIds : []);
        this.items = ordered.slice(0, 60).map((r) => ({
          kind: "command",
          id: r.id,
          name: r.name,
          matchIndices: r.matchIndices,
          isRecent: recentSet.has(r.id)
        }));
      } else if (mode === "content") {
        const text = body;
        this.setBadge("Content", "is-content");
        if (text.length === 0) {
          const history = (_e = this.plugin.settings.recentSearches) != null ? _e : [];
          this.items = history.map((q) => ({ kind: "history", query: q }));
          if (generation !== this.searchGeneration) return;
          this.isLoading = false;
          this.selectedIndex = 0;
          if (this.items.length === 0) {
            this.renderEmptyState(
              "text",
              "Search file contents",
              "Type to search inside your notes. Recent searches will appear here."
            );
            this.updateStatus(0);
          } else {
            this.renderResults();
            this.updateStatus(this.items.length);
            this.updatePreview();
          }
          return;
        }
        const contentResults = await this.plugin.contentSearcher.search(text, {
          useRipgrep: isPro,
          includeCanvas: isPro && includeCanvas,
          includeBases: isPro && includeBases,
          excludeFolders
        });
        if (generation !== this.searchGeneration) return;
        this.items = contentResults.map((r) => ({
          kind: "content",
          file: r.file,
          line: r.line,
          snippet: r.snippet,
          score: r.score,
          engine: r.engine
        }));
      } else if (mode === "headings") {
        this.setBadge("Headings", "is-content");
        const parsed = parseHeadingQuery(body);
        const headingResults = this.headingSearcher.search(parsed.headingQuery, {
          excludeFolders,
          limit: 60,
          fileQuery: parsed.fileQuery,
          levelMin: parsed.levelMin,
          levelMax: parsed.levelMax
        });
        if (generation !== this.searchGeneration) return;
        this.items = headingResults.map((r) => ({
          kind: "heading",
          file: r.file,
          line: r.line,
          heading: r.heading,
          level: r.level,
          score: r.score,
          matchIndices: r.matchIndices
        }));
      } else if (mode === "symbols") {
        const target = (_f = this.drillFile) != null ? _f : this.app.workspace.getActiveFile();
        this.setBadge(target ? `Symbols \xB7 ${target.basename}` : "Symbols", "is-content");
        if (!target || target.extension !== "md") {
          this.items = [];
          this.isLoading = false;
          this.renderEmptyState(
            "heading",
            "No note to outline",
            "Open a Markdown note, or arrow onto a file result and press the symbols trigger."
          );
          this.updateStatus(0);
          return;
        }
        const symbolResults = this.symbolSearcher.search(target, body, 100);
        if (generation !== this.searchGeneration) return;
        this.items = symbolResults.map((r) => ({
          kind: "symbol",
          file: r.file,
          line: r.line,
          text: r.text,
          symbolType: r.symbolType,
          level: r.level,
          matchIndices: r.matchIndices
        }));
      } else if (mode === "editors") {
        this.setBadge("Editors", "is-content");
        const editorResults = this.editorSearcher.search(body, 60);
        if (generation !== this.searchGeneration) return;
        this.items = editorResults.map((r) => ({
          kind: "editor",
          leaf: r.leaf,
          file: r.file,
          title: r.title,
          viewType: r.viewType,
          isActive: r.isActive,
          isPinned: r.isPinned,
          matchIndices: r.matchIndices
        }));
        if (this.items.length === 0) {
          this.isLoading = false;
          this.renderEmptyState("layout", "No open editors", "Open a few notes, then jump between their tabs from here.");
          this.updateStatus(0);
          return;
        }
      } else if (mode === "folders") {
        this.setBadge("Folders", "is-content");
        this.items = this.folderItems(body);
        if (this.items.length === 0) {
          this.isLoading = false;
          this.renderEmptyState("folder", "No matching folders", "Press Enter on a folder to browse its files.");
          this.updateStatus(0);
          return;
        }
      } else if (mode === "links") {
        const linkTarget = (_g = this.drillFile) != null ? _g : this.app.workspace.getActiveFile();
        this.setBadge(linkTarget && !body ? `Links \xB7 ${linkTarget.basename}` : "Links", "is-content");
        this.items = this.linkModeItems(body);
        if (this.items.length === 0) {
          this.isLoading = false;
          this.renderEmptyState("link", "No linked notes found", "Use Links mode on an active note, or type a note name to inspect backlinks.");
          this.updateStatus(0);
          return;
        }
      } else if (mode === "capture") {
        this.setBadge("Capture", "is-content");
        this.items = this.captureItems(body);
      } else if (mode === "snippets") {
        this.setBadge("Snippets", "is-content");
        this.items = this.snippetItems(body);
        if (this.items.length === 0) {
          this.isLoading = false;
          const hasSnippets = this.plugin.settings.snippets.length > 0;
          this.renderEmptyState(
            "clipboard-type",
            hasSnippets ? "No matching snippets" : "No snippets yet",
            hasSnippets ? "Try a different snippet name." : "Add reusable snippets in Settings \u2192 Vault Spotlight, then insert them here."
          );
          this.updateStatus(0);
          return;
        }
      } else {
        this.setBadge(isEmptyQuery ? "Browse" : "Files", null);
        const parsed = tokenizeQuery(body);
        const fileResults = this.fileSearcher.search({
          textTokens: parsed.textTokens,
          phrases: isPro ? parsed.phrases : [],
          exclusions: isPro ? parsed.exclusions : [],
          // in: stays free — folder mode's Enter-to-browse depends on it.
          folderIncludes: parsed.folderIncludes,
          pathTerms: isPro ? parsed.pathTerms : [],
          nameTerms: isPro ? parsed.nameTerms : [],
          tags: parsed.tags,
          properties: parsed.properties,
          extFilters: isPro ? parsed.extFilters : [],
          isStarred: isPro ? parsed.isStarred : false,
          isBookmarked: isPro ? parsed.isBookmarked : false,
          modifiedDays: isPro ? parsed.modifiedDays : null,
          createdDays: isPro ? parsed.createdDays : null,
          recentPaths: this.plugin.settings.recentPaths,
          starredPaths: isPro ? this.plugin.settings.starredPaths : [],
          bookmarkedPaths: this.plugin.getBookmarkedPaths(),
          openPaths: this.editorSearcher.openFilePaths(),
          includeCanvas: isPro && includeCanvas,
          includePdf: isPro && includePdf,
          includeBases: isPro && includeBases,
          excludeFolders,
          frecency: this.plugin.settings.useFrecency ? this.plugin.settings.fileFrecency : void 0,
          ranking: this.plugin.settings.ranking,
          rankingMode: (_h = workflow == null ? void 0 : workflow.rankingMode) != null ? _h : profile == null ? void 0 : profile.rankingMode,
          limit: isEmptyQuery ? 40 : 50
        });
        this.items = fileResults.map((r) => ({
          kind: "file",
          file: r.file,
          score: r.score,
          matchIndices: r.matchIndices,
          modifiedLabel: r.modifiedLabel,
          fileKind: r.fileKind,
          primaryMatch: r.primaryMatch,
          aliasMatched: r.aliasMatched,
          tags: r.tags,
          aliases: r.aliases,
          isRecent: r.isRecent,
          isStarred: r.isStarred,
          isBookmarked: r.isBookmarked
        }));
        if (isEmptyQuery && isPro) {
          const workflows = ensureStarterWorkflows(this.plugin.settings.workflowPresets).slice().sort((a, b) => {
            var _a2, _b2;
            return Number(b.pinned) - Number(a.pinned) || Number((_a2 = b.starter) != null ? _a2 : false) - Number((_b2 = a.starter) != null ? _b2 : false) || a.name.localeCompare(b.name);
          }).map((workflow2) => {
            var _a2;
            return {
              kind: "workflow",
              id: workflow2.id,
              name: workflow2.name,
              query: workflow2.query,
              mode: workflow2.mode,
              profileId: workflow2.profileId,
              isPinned: workflow2.pinned,
              isStarter: (_a2 = workflow2.starter) != null ? _a2 : false,
              rankingMode: workflow2.rankingMode
            };
          });
          this.items = [...workflows, ...this.items];
        }
        if (isEmptyQuery && isPro && this.plugin.settings.searchProfiles.length > 0) {
          const profiles = this.plugin.settings.searchProfiles.map((searchProfile) => ({
            kind: "profile",
            id: searchProfile.id,
            name: searchProfile.name,
            defaultMode: searchProfile.defaultMode,
            defaultQuery: searchProfile.defaultQuery,
            isActive: searchProfile.id === this.plugin.settings.activeProfileId
          }));
          this.items = [...profiles, ...this.items];
        }
        if (isEmptyQuery && isPro && this.plugin.settings.customSearches.length > 0) {
          const pinned = new Set(this.plugin.settings.pinnedCustomSearchIds);
          const collections = this.plugin.settings.customSearches.slice().sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)) || a.name.localeCompare(b.name)).map((search) => ({
            kind: "collection",
            id: search.id,
            name: search.name,
            query: search.query,
            isPinned: pinned.has(search.id)
          }));
          this.items = [...collections, ...this.items];
        }
        if (!isEmptyQuery) {
          const smartItems = this.computeSmartItems(body);
          if (smartItems.length > 0) this.items = [...smartItems, ...this.items];
        }
        const noFilters = parsed.tags.length === 0 && parsed.properties.length === 0 && parsed.extFilters.length === 0 && parsed.phrases.length === 0 && parsed.exclusions.length === 0 && parsed.folderIncludes.length === 0 && parsed.pathTerms.length === 0 && parsed.nameTerms.length === 0 && !parsed.isStarred && !parsed.isBookmarked && parsed.modifiedDays === null && parsed.createdDays === null;
        if (this.items.length === 0 && !isEmptyQuery && noFilters) {
          this.items = [{ kind: "create", name: body }];
        }
      }
    } catch (err) {
      if (generation !== this.searchGeneration) return;
      console.error("[VaultSpotlight] search failed", err);
      this.items = [];
      this.isLoading = false;
      this.renderEmptyState("alert-triangle", "Search failed", "Something went wrong. Try a different query.");
      this.updateStatus(0);
      return;
    }
    this.isLoading = false;
    this.selectedIndex = 0;
    this.renderResults();
    this.updateStatus(this.items.length);
    this.updatePreview();
  }
  setBadge(text, cls) {
    this.modeBadgeEl.setText(text);
    this.modeBadgeEl.removeClass("is-content");
    this.modeBadgeEl.removeClass("is-pro");
    if (cls) this.modeBadgeEl.addClass(cls);
  }
  getBrowseSection(item) {
    if (item.kind === "workflow" && this.inputEl.value.trim().length === 0) return "Workflows";
    if (item.kind === "profile" && this.inputEl.value.trim().length === 0) return "Search profiles";
    if (item.kind === "collection" && this.inputEl.value.trim().length === 0) return "Smart collections";
    if (item.kind !== "file" || this.inputEl.value.trim().length > 0) return null;
    if (item.isStarred) return "Starred";
    if (item.isBookmarked) return "Bookmarks";
    if (item.isRecent) return "Recent";
    return "All notes";
  }
  fileToResult(file, score, bookmarkedPaths) {
    return {
      kind: "file",
      file,
      score,
      matchIndices: [],
      modifiedLabel: "",
      fileKind: getVaultFileKind(file),
      primaryMatch: "browse",
      aliasMatched: false,
      tags: [],
      aliases: [],
      isRecent: this.plugin.settings.recentPaths.includes(file.path),
      isStarred: this.plugin.isStarred(file.path),
      isBookmarked: bookmarkedPaths.has(file.path)
    };
  }
  linkModeItems(query) {
    var _a, _b;
    const active = this.app.workspace.getActiveFile();
    const files = this.app.vault.getMarkdownFiles();
    const q = query.replace(/^(<-|->|\[\[)\s?/, "").trim().toLowerCase();
    const target = (_a = this.drillFile) != null ? _a : q ? this.bestFileMatch(files, q) : active;
    if (!target) return [];
    const resolvedLinks = (_b = this.app.metadataCache.resolvedLinks) != null ? _b : {};
    let linked = query.trim().startsWith("->") ? findOutlinks(files, resolvedLinks, target.path) : findBacklinks(files, resolvedLinks, target.path);
    if (this.drillFile && q) {
      linked = linked.filter((file) => {
        var _a2;
        return (_a2 = fuzzyMatch(q, file.basename)) != null ? _a2 : fuzzyMatch(q, file.path);
      });
    }
    const bookmarkedPaths = new Set(this.plugin.getBookmarkedPaths());
    return linked.slice(0, 60).map((file, index) => this.fileToResult(file, 1e3 - index, bookmarkedPaths));
  }
  /** The highest-scoring fuzzy match for `q`, not just the first substring hit. */
  bestFileMatch(files, q) {
    var _a;
    let best = null;
    let bestScore = -1;
    for (const file of files) {
      const match = (_a = fuzzyMatch(q, file.basename)) != null ? _a : fuzzyMatch(q, file.path);
      if (match && match.score > bestScore) {
        best = file;
        bestScore = match.score;
      }
    }
    return best;
  }
  folderItems(query) {
    const q = query.trim();
    const rows = [];
    for (const abstract of this.app.vault.getAllLoadedFiles()) {
      if (!(abstract instanceof import_obsidian9.TFolder) || abstract.isRoot()) continue;
      if (q.length === 0) {
        rows.push({ folder: abstract, score: 1, indices: [] });
        continue;
      }
      const nameMatch = fuzzyMatch(q, abstract.name);
      const match = nameMatch != null ? nameMatch : fuzzyMatch(q, abstract.path);
      if (!match) continue;
      rows.push({
        folder: abstract,
        // Prefer name hits; path-only hits rank at a discount and get no
        // highlight (indices would point into the path, not the name).
        score: nameMatch ? match.score + 10 : Math.floor(match.score / 2),
        indices: nameMatch ? match.indices : []
      });
    }
    rows.sort((a, b) => b.score - a.score || a.folder.path.localeCompare(b.folder.path));
    return rows.slice(0, 60).map((row) => ({
      kind: "folder",
      folder: row.folder,
      matchIndices: row.indices
    }));
  }
  // --- Delight layer: calculator, dates, capture, snippets -----------------
  currencyRates() {
    return parseCurrencyRates(this.plugin.settings.currencyRates);
  }
  /**
   * Ambient calculator / natural-language date rows for the files mode. Returns
   * at most one row (a calculation takes precedence over a date), or none when
   * the query is ordinary text — so plain searches are never intercepted.
   */
  computeSmartItems(body) {
    const text = body.trim();
    if (!text) return [];
    if (this.plugin.settings.enableDateJump) {
      const date = parseNaturalDate(text);
      if (date) {
        const { path, exists } = this.resolveDatePath(date.date);
        return [{ kind: "datejump", date: date.date, label: date.label, path, exists }];
      }
    }
    if (this.plugin.settings.enableCalculator) {
      const calc = evaluateExpression(text, { rates: this.currencyRates() });
      if (calc) {
        const detail = calc.kind === "currency" ? "Currency \xB7 your rates" : calc.kind === "unit" ? "Unit conversion" : calc.kind === "temp" ? "Temperature" : calc.kind === "percent" ? "Percentage" : "Calculator";
        return [{ kind: "calc", expression: calc.expression, result: calc.formatted, detail }];
      }
    }
    return [];
  }
  copyCalcResult(item) {
    void copyToClipboard(item.result, `Copied ${item.result}`);
    this.close();
  }
  insertCalcResult(item) {
    var _a;
    const editor = (_a = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView)) == null ? void 0 : _a.editor;
    if (!editor) {
      this.copyCalcResult(item);
      return;
    }
    this.close();
    editor.replaceSelection(item.result);
    editor.focus();
  }
  /** Daily-note folder + moment format from the core or Periodic Notes plugin. */
  dailyNoteConfig() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const internal = this.app.internalPlugins;
    const opts = (_c = (_b = (_a = internal == null ? void 0 : internal.getPluginById) == null ? void 0 : _a.call(internal, "daily-notes")) == null ? void 0 : _b.instance) == null ? void 0 : _c.options;
    if (opts && (opts.format || opts.folder !== void 0)) {
      return { folder: ((_d = opts.folder) != null ? _d : "").trim(), format: (opts.format || "YYYY-MM-DD").trim() };
    }
    const periodic = (_f = (_e = this.app.plugins) == null ? void 0 : _e.plugins) == null ? void 0 : _f["periodic-notes"];
    const pd = (_g = periodic == null ? void 0 : periodic.settings) == null ? void 0 : _g.daily;
    if (pd && (pd.format || pd.folder)) {
      return { folder: ((_h = pd.folder) != null ? _h : "").trim(), format: (pd.format || "YYYY-MM-DD").trim() };
    }
    return { folder: "", format: "YYYY-MM-DD" };
  }
  resolveDatePath(ms) {
    const { folder, format } = this.dailyNoteConfig();
    const name = (0, import_obsidian9.moment)(ms).format(format);
    const path = (0, import_obsidian9.normalizePath)(folder ? `${folder}/${name}.md` : `${name}.md`);
    const exists = this.app.vault.getAbstractFileByPath(path) instanceof import_obsidian9.TFile;
    return { path, exists };
  }
  /** Create the parent folder chain for `filePath` if it doesn't exist yet. */
  async ensureFolder(filePath) {
    const slash = filePath.lastIndexOf("/");
    if (slash === -1) return;
    const dir = filePath.slice(0, slash);
    if (!dir || this.app.vault.getAbstractFileByPath(dir)) return;
    try {
      await this.app.vault.createFolder(dir);
    } catch (e) {
    }
  }
  async openOrCreateDatedNote(ms) {
    const { path } = this.resolveDatePath(ms);
    try {
      let file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof import_obsidian9.TFile)) {
        await this.ensureFolder(path);
        file = await this.app.vault.create(path, "");
      }
      if (file instanceof import_obsidian9.TFile) {
        await this.app.workspace.getLeaf(false).openFile(file);
        this.plugin.trackRecent(file.path);
      }
    } catch (err) {
      console.error("[VaultSpotlight] open daily note failed", err);
      new import_obsidian9.Notice("Vault Spotlight: could not open the daily note.");
    }
  }
  captureItems(body) {
    const text = body.trim();
    const dailyName = (0, import_obsidian9.moment)().format(this.dailyNoteConfig().format);
    const captureHeading = this.plugin.settings.isPro ? this.plugin.settings.captureHeading : "";
    const captureMode = this.plugin.settings.isPro ? this.plugin.settings.captureMode : "append";
    const items = [
      {
        kind: "capture",
        text,
        target: "daily",
        label: "Daily note",
        description: describeCaptureTarget({
          hasText: text.length > 0,
          targetLabel: dailyName,
          mode: captureMode,
          heading: captureHeading
        })
      }
    ];
    const inbox = this.plugin.settings.captureInboxPath.trim();
    if (this.plugin.settings.isPro && inbox) {
      items.push({
        kind: "capture",
        text,
        target: "inbox",
        label: "Inbox",
        description: describeCaptureTarget({
          hasText: text.length > 0,
          targetLabel: inbox,
          mode: captureMode,
          heading: captureHeading
        })
      });
    }
    return items;
  }
  async runCapture(item) {
    const text = item.text.trim();
    if (!text) {
      new import_obsidian9.Notice("Vault Spotlight: type something to capture.");
      return;
    }
    const settings = this.plugin.settings;
    const path = item.target === "inbox" ? (0, import_obsidian9.normalizePath)(settings.captureInboxPath.trim()) : this.resolveDatePath(Date.now()).path;
    if (!path) {
      new import_obsidian9.Notice("Vault Spotlight: no capture target configured.");
      return;
    }
    this.recordSearch();
    this.close();
    try {
      await this.ensureFolder(path);
      let file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof import_obsidian9.TFile)) file = await this.app.vault.create(path, "");
      if (file instanceof import_obsidian9.TFile) {
        const existing = await this.app.vault.read(file);
        const updated = insertCapture(existing, text, {
          mode: settings.isPro ? settings.captureMode : "append",
          heading: settings.isPro ? settings.captureHeading : ""
        });
        await this.app.vault.modify(file, updated);
        new import_obsidian9.Notice(`Vault Spotlight: captured to ${file.basename}.`);
      }
    } catch (err) {
      console.error("[VaultSpotlight] capture failed", err);
      new import_obsidian9.Notice("Vault Spotlight: capture failed.");
    }
  }
  snippetItems(query) {
    const q = query.trim().toLowerCase();
    const rows = [];
    for (const snippet of this.plugin.settings.snippets) {
      if (!q) {
        rows.push({ id: snippet.id, name: snippet.name, body: snippet.body, score: 1, indices: [] });
        continue;
      }
      const nameMatch = fuzzyMatch(q, snippet.name);
      const match = nameMatch != null ? nameMatch : fuzzyMatch(q, snippet.body);
      if (!match) continue;
      rows.push({
        id: snippet.id,
        name: snippet.name,
        body: snippet.body,
        score: nameMatch ? match.score + 10 : match.score,
        indices: nameMatch ? nameMatch.indices : []
      });
    }
    rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return rows.slice(0, 60).map((row) => ({
      kind: "snippet",
      id: row.id,
      name: row.name,
      body: row.body,
      matchIndices: row.indices
    }));
  }
  async insertSnippet(item) {
    var _a, _b, _c;
    const editor = (_b = (_a = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView)) == null ? void 0 : _a.editor) != null ? _b : null;
    const selection = (_c = editor == null ? void 0 : editor.getSelection()) != null ? _c : "";
    let clipboard = "";
    if (item.body.includes("{{clipboard}}")) {
      try {
        clipboard = await navigator.clipboard.readText();
      } catch (e) {
        clipboard = "";
      }
    }
    const { text, cursorOffset } = expandSnippet(item.body, {
      date: (0, import_obsidian9.moment)().format("YYYY-MM-DD"),
      time: (0, import_obsidian9.moment)().format("HH:mm"),
      clipboard,
      selection
    });
    this.close();
    if (editor) {
      const from = editor.getCursor("from");
      editor.replaceSelection(text);
      const caret = editor.offsetToPos(editor.posToOffset(from) + cursorOffset);
      editor.setCursor(caret);
      editor.focus();
    } else {
      void copyToClipboard(text, "Snippet copied");
    }
  }
  renderLoading() {
    this.resultsEl.empty();
    this.resultsEl.addClass("vault-spotlight-loading");
    for (let i = 0; i < 5; i++) {
      this.resultsEl.createDiv({ cls: "vault-spotlight-skeleton" });
    }
  }
  renderEmptyState(icon, title, desc) {
    if (this.loadingTimer !== null) {
      window.clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    this.resultsEl.empty();
    this.resultsEl.removeClass("vault-spotlight-loading");
    const empty = this.resultsEl.createDiv({ cls: "vault-spotlight-empty" });
    const iconWrap = empty.createDiv({ cls: "vault-spotlight-empty-icon" });
    (0, import_obsidian9.setIcon)(iconWrap, icon);
    empty.createDiv({ cls: "vault-spotlight-empty-title", text: title });
    empty.createDiv({ cls: "vault-spotlight-empty-desc", text: desc });
  }
  renderResults() {
    if (this.loadingTimer !== null) {
      window.clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
    this.resultsEl.empty();
    this.resultsEl.removeClass("vault-spotlight-loading");
    if (this.items.length === 0) {
      if (this.inputEl.value.trim().length === 0) {
        this.renderEmptyState(
          "files",
          "No notes in this vault yet",
          "Create a note and it will show up here instantly."
        );
      } else {
        this.renderEmptyState(
          "search",
          "No matches found",
          "Try a shorter query, fewer filters, or check your spelling."
        );
      }
      return;
    }
    const isEmptyQuery = this.inputEl.value.trim().length === 0;
    let lastSection = "";
    this.items.forEach((item, index) => {
      const section = this.getBrowseSection(item);
      if (section && section !== lastSection) {
        this.resultsEl.createDiv({ cls: "vault-spotlight-section-label", text: section });
        lastSection = section;
      }
      const row = this.resultsEl.createDiv({
        cls: "vault-spotlight-item",
        attr: { role: "option", id: `vault-spotlight-opt-${index}` }
      });
      row.dataset.index = String(index);
      this.applyRowState(row, index);
      const file = itemFile(item);
      if (this.plugin.settings.isPro && file) {
        const check = row.createDiv({ cls: "vault-spotlight-check" });
        if (this.checkedPaths.has(file.path)) {
          (0, import_obsidian9.setIcon)(check, "check");
        }
      }
      renderResultRow(row, item, {
        isEmptyQuery,
        showModifiedTime: this.plugin.settings.showModifiedTime,
        showMatchReasons: this.plugin.settings.ranking.showMatchReasons
      });
      if (this.plugin.settings.isPro && item.kind === "file") {
        const starItem = item;
        const starBtn = row.createEl("button", {
          cls: "vault-spotlight-star-btn",
          attr: { type: "button" }
        });
        (0, import_obsidian9.setIcon)(starBtn, starItem.isStarred ? "star" : "star-off");
        starBtn.setAttr("aria-label", starItem.isStarred ? "Unstar" : "Star");
        starBtn.addEventListener("mousedown", (evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          starItem.isStarred = this.plugin.toggleStar(starItem.file.path);
          (0, import_obsidian9.setIcon)(starBtn, starItem.isStarred ? "star" : "star-off");
          starBtn.setAttr("aria-label", starItem.isStarred ? "Unstar" : "Star");
          row.toggleClass("is-starred", starItem.isStarred);
        });
      }
      row.addEventListener("mouseenter", () => {
        this.selectedIndex = index;
        this.updateSelectionHighlight();
      });
      row.addEventListener("mousedown", (evt) => {
        if (evt.target.closest(".vault-spotlight-star-btn")) return;
        evt.preventDefault();
        this.selectedIndex = index;
        void this.activateSelection();
      });
      if (file) {
        row.addEventListener("contextmenu", (evt) => {
          evt.preventDefault();
          this.selectedIndex = index;
          this.updateSelectionHighlight();
          this.openActionsMenu(item, evt);
        });
      }
    });
  }
  applyRowState(row, index) {
    const selected = index === this.selectedIndex;
    row.toggleClass("is-selected", selected);
    row.setAttribute("aria-selected", String(selected));
    const item = this.items[index];
    const file = item ? itemFile(item) : null;
    if (file) {
      row.toggleClass("is-checked", this.checkedPaths.has(file.path));
    }
  }
  updateSelectionHighlight() {
    const rows = this.resultsEl.querySelectorAll(".vault-spotlight-item");
    rows.forEach((row) => {
      const index = Number(row.dataset.index);
      this.applyRowState(row, index);
    });
    const selected = this.resultsEl.querySelector(".is-selected");
    selected == null ? void 0 : selected.scrollIntoView({ block: "nearest" });
    if (selected == null ? void 0 : selected.id) this.inputEl.setAttribute("aria-activedescendant", selected.id);
    else this.inputEl.removeAttribute("aria-activedescendant");
    this.renderFooter();
    this.updateStatus(this.items.length);
    this.updatePreview();
  }
  renderFooter() {
    var _a, _b;
    this.footerEl.empty();
    const shortcuts = this.footerEl.createDiv({ cls: "vault-spotlight-shortcuts" });
    const selected = (_a = this.items[this.selectedIndex]) != null ? _a : null;
    for (const hint of getShortcutHints({
      itemKind: (_b = selected == null ? void 0 : selected.kind) != null ? _b : null,
      defaultNewTab: this.plugin.settings.defaultNewTab,
      isPro: this.plugin.settings.isPro
    })) {
      this.addShortcut(shortcuts, hint.keys, hint.label);
    }
    if ((selected == null ? void 0 : selected.kind) !== "calc") this.addShortcut(shortcuts, ["Alt", "\u21B5"], "menu");
    this.statusEl = this.footerEl.createSpan({
      cls: "vault-spotlight-status",
      attr: { role: "status", "aria-live": "polite" }
    });
  }
  addShortcut(container, keys, label) {
    const wrap = container.createSpan({ cls: "vault-spotlight-shortcut" });
    for (const key of keys) {
      wrap.createEl("kbd", { text: key });
    }
    wrap.appendText(` ${label}`);
  }
  updateStatus(count) {
    var _a;
    (_a = this.inputEl) == null ? void 0 : _a.setAttribute("aria-expanded", count > 0 ? "true" : "false");
    if (!this.statusEl) return;
    if (this.checkedPaths.size > 0) {
      this.statusEl.setText(`${this.checkedPaths.size} selected`);
      return;
    }
    if (count === 0) {
      this.statusEl.setText("");
      return;
    }
    this.statusEl.setText(`${count} result${count === 1 ? "" : "s"}`);
  }
  moveSelection(delta) {
    if (this.items.length === 0) return;
    if (this.resultsEl.querySelector(".vault-spotlight-item") === null) return;
    this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length;
    this.hasNavigated = true;
    this.updateSelectionHighlight();
  }
  /** Shift+Enter: create a note named after the current query text. */
  async createFromQuery() {
    const selected = this.items[this.selectedIndex];
    if ((selected == null ? void 0 : selected.kind) === "calc") {
      this.insertCalcResult(selected);
      return;
    }
    if (selected && (selected.kind === "capture" || selected.kind === "snippet" || selected.kind === "datejump")) {
      await this.activateSelection();
      return;
    }
    const { body } = this.resolveQuery(this.inputEl.value);
    if (!body) return;
    this.recordSearch();
    this.close();
    await this.createAndOpen(body);
  }
  drillInto(file, mode) {
    this.drillReturnQuery = this.inputEl.value;
    this.drillReturnMode = this.mode;
    this.drillFile = file;
    this.mode = mode;
    this.inputEl.value = "";
    this.hasNavigated = false;
    this.focusInput();
    void this.runSearch();
  }
  exitDrill() {
    if (!this.drillFile) return;
    this.drillFile = null;
    this.mode = this.drillReturnMode;
    this.inputEl.value = this.drillReturnQuery;
    this.hasNavigated = false;
    this.focusInput();
    void this.runSearch();
  }
  toggleCheck() {
    const item = this.items[this.selectedIndex];
    const file = item ? itemFile(item) : null;
    if (!file) return;
    if (this.checkedPaths.has(file.path)) {
      this.checkedPaths.delete(file.path);
    } else {
      this.checkedPaths.add(file.path);
    }
    this.updateSelectionHighlight();
    this.updateStatus(this.items.length);
  }
  toggleStarSelected() {
    const item = this.items[this.selectedIndex];
    if (!item || item.kind !== "file") return;
    item.isStarred = this.plugin.toggleStar(item.file.path);
    const row = this.resultsEl.querySelector(
      `.vault-spotlight-item[data-index="${this.selectedIndex}"]`
    );
    row == null ? void 0 : row.toggleClass("is-starred", item.isStarred);
    const starBtn = row == null ? void 0 : row.querySelector(".vault-spotlight-star-btn");
    if (starBtn) {
      (0, import_obsidian9.setIcon)(starBtn, item.isStarred ? "star" : "star-off");
      starBtn.setAttr("aria-label", item.isStarred ? "Unstar" : "Star");
    }
  }
  cycleMode() {
    const idx = MODE_ORDER.indexOf(this.mode);
    this.mode = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
    const detected = detectModeFromPrefix(
      this.inputEl.value,
      this.plugin.settings.modePrefixes,
      this.plugin.settings.escapeChar
    );
    if (detected.mode) this.inputEl.value = detected.body;
    this.focusInput();
    void this.runSearch();
  }
  async activateSelection(paneOverride = null) {
    const selected = this.items[this.selectedIndex];
    if (!selected) return;
    if (selected.kind === "editor") {
      this.recordSearch();
      this.close();
      this.editorSearcher.activate(selected.leaf);
      if (selected.file) this.plugin.trackRecent(selected.file.path);
      return;
    }
    if (selected.kind === "folder") {
      this.drillFile = null;
      this.mode = "files";
      this.inputEl.value = `in:"${selected.folder.path}" `;
      this.focusInput();
      void this.runSearch();
      return;
    }
    if (selected.kind === "history") {
      this.inputEl.value = selected.query;
      this.focusInput();
      void this.runSearch();
      return;
    }
    if (selected.kind === "collection") {
      this.inputEl.value = selected.query;
      this.actionContext = null;
      this.mode = "files";
      this.focusInput();
      void this.runSearch();
      return;
    }
    if (selected.kind === "profile") {
      this.activateProfile(selected.id);
      return;
    }
    if (selected.kind === "workflow") {
      this.applyWorkflow(selected.id);
      return;
    }
    if (selected.kind === "action") {
      if (selected.action.requiresPro && !this.plugin.settings.isPro) {
        new import_obsidian9.Notice("Vault Spotlight: Pro required for this action.");
        return;
      }
      await selected.action.run();
      return;
    }
    if (selected.kind === "command") {
      this.close();
      if (this.commandSearcher.execute(selected.id)) this.plugin.trackCommand(selected.id);
      return;
    }
    if (selected.kind === "create") {
      this.recordSearch();
      this.close();
      await this.createAndOpen(selected.name);
      return;
    }
    if (selected.kind === "calc") {
      this.copyCalcResult(selected);
      return;
    }
    if (selected.kind === "datejump") {
      this.close();
      await this.openOrCreateDatedNote(selected.date);
      return;
    }
    if (selected.kind === "capture") {
      await this.runCapture(selected);
      return;
    }
    if (selected.kind === "snippet") {
      await this.insertSnippet(selected);
      return;
    }
    this.recordSearch();
    let targets = this.checkedPaths.size > 0 ? this.items.filter((i) => {
      const f = itemFile(i);
      return f ? this.checkedPaths.has(f.path) : false;
    }) : [selected];
    if (targets.length === 0) targets = [selected];
    this.checkedPaths.clear();
    this.close();
    const defaultTarget = this.plugin.settings.defaultNewTab ? "tab" : null;
    const target = targets.length > 1 ? "tab" : paneOverride != null ? paneOverride : defaultTarget;
    for (const item of targets) {
      const file = itemFile(item);
      if (!file) continue;
      try {
        await this.openItem(item, target);
        this.plugin.trackRecent(file.path);
      } catch (err) {
        console.error("[VaultSpotlight] failed to open", file.path, err);
      }
    }
  }
  async openItem(item, target) {
    const file = itemFile(item);
    if (!file) return;
    const leaf = target === null ? this.app.workspace.getLeaf(false) : this.app.workspace.getLeaf(target);
    await leaf.openFile(file);
    const line = item.kind === "content" || item.kind === "heading" || item.kind === "symbol" ? item.line : null;
    if (line !== null && file.extension === "md" && leaf.view instanceof import_obsidian9.MarkdownView) {
      const editor = leaf.view.editor;
      editor.setCursor({ line: line - 1, ch: 0 });
      editor.scrollIntoView({ from: { line: line - 1, ch: 0 }, to: { line: line - 1, ch: 0 } }, true);
    }
  }
  async createAndOpen(rawName) {
    var _a, _b;
    try {
      const cleaned = rawName.replace(/[\\/:*?"<>|]/g, "").trim() || "Untitled";
      const parent = this.app.fileManager.getNewFileParent(
        (_b = (_a = this.app.workspace.getActiveFile()) == null ? void 0 : _a.path) != null ? _b : ""
      );
      const dir = parent.path ? `${parent.path}/` : "";
      const path = (0, import_obsidian9.normalizePath)(`${dir}${cleaned}.md`);
      const existing = this.app.vault.getAbstractFileByPath(path);
      const file = existing instanceof import_obsidian9.TFile ? existing : await this.app.vault.create(path, "");
      await this.app.workspace.getLeaf(false).openFile(file);
      this.plugin.trackRecent(file.path);
    } catch (err) {
      console.error("[VaultSpotlight] create note failed", err);
      new import_obsidian9.Notice("Vault Spotlight: could not create note.");
    }
  }
  openActionPalette(context = ((_a) => (_a = this.items[this.selectedIndex]) != null ? _a : null)()) {
    if (!context || context.kind === "action" || context.kind === "history" || context.kind === "create") return;
    this.actionContext = context;
    this.actionReturnQuery = this.inputEl.value;
    this.actionReturnMode = this.mode;
    this.resultSnapshot = this.items;
    this.inputEl.value = "";
    this.focusInput();
    void this.runSearch();
  }
  closeActionPalette() {
    if (!this.actionContext) return;
    this.actionContext = null;
    this.inputEl.value = this.actionReturnQuery;
    this.mode = this.actionReturnMode;
    this.focusInput();
    void this.runSearch();
  }
  activateProfile(id) {
    const profile = activeProfile(this.plugin.settings.searchProfiles, id);
    if (!profile) return;
    this.plugin.settings.activeProfileId = profile.id;
    void this.plugin.saveSettings();
    this.actionContext = null;
    this.mode = profile.defaultMode;
    this.inputEl.value = profile.defaultQuery;
    this.focusInput();
    void this.runSearch();
  }
  clearProfile() {
    this.plugin.settings.activeProfileId = "";
    void this.plugin.saveSettings();
    this.actionContext = null;
    this.inputEl.value = "";
    this.mode = "files";
    void this.runSearch();
  }
  applyWorkflow(id) {
    const workflows = ensureStarterWorkflows(this.plugin.settings.workflowPresets);
    const workflow = workflows.find((entry) => entry.id === id);
    if (!workflow) return;
    this.activeWorkflowId = workflow.id;
    this.actionContext = null;
    if (workflow.profileId) {
      this.plugin.settings.activeProfileId = workflow.profileId;
    }
    this.mode = workflow.mode;
    this.inputEl.value = workflow.query;
    void this.plugin.saveSettings();
    this.focusInput();
    void this.runSearch();
  }
  saveCurrentProfile() {
    new PromptModal(this.app, {
      title: "Save search profile",
      initial: "New profile",
      cta: "Save profile",
      onSubmit: (name) => {
        const profile = createProfileFromSettings(name, this.plugin.settings, this.actionReturnMode || this.mode, this.actionReturnQuery || this.inputEl.value);
        const exists = this.plugin.settings.searchProfiles.some((p) => p.id === profile.id);
        this.plugin.settings.searchProfiles = [
          ...this.plugin.settings.searchProfiles.filter((p) => p.id !== profile.id),
          { ...profile, id: exists ? `${profile.id}-${Date.now()}` : profile.id }
        ].slice(0, 20);
        void this.plugin.saveSettings();
        new import_obsidian9.Notice("Vault Spotlight: search profile saved.");
        this.closeActionPalette();
      }
    }).open();
  }
  saveCurrentWorkflow() {
    const mode = this.actionReturnMode || this.mode;
    const query = (this.actionReturnQuery || this.inputEl.value).trim();
    if (!canSaveWorkflowPreset(this.plugin.settings.workflowPresets, this.plugin.settings.isPro)) {
      new import_obsidian9.Notice("Vault Spotlight: workflows require Pro and a non-empty search.");
      return;
    }
    new PromptModal(this.app, {
      title: "Save workflow",
      initial: query.slice(0, 40) || "New workflow",
      cta: "Save workflow",
      onSubmit: (name) => {
        var _a;
        const workflow = createWorkflowPreset(name, mode, query, {
          profileId: this.plugin.settings.activeProfileId,
          rankingMode: (_a = this.currentProfile()) == null ? void 0 : _a.rankingMode
        });
        this.plugin.settings.workflowPresets = [workflow, ...this.plugin.settings.workflowPresets].slice(0, 20);
        this.activeWorkflowId = workflow.id;
        void this.plugin.saveSettings();
        new import_obsidian9.Notice("Vault Spotlight: workflow saved.");
        this.closeActionPalette();
      }
    }).open();
  }
  installedSearchIntegrations() {
    var _a, _b;
    const plugins = (_b = (_a = this.app.plugins) == null ? void 0 : _a.plugins) != null ? _b : {};
    return detectSearchIntegrations(Object.keys(plugins));
  }
  runIntegrationCommand(name) {
    const command = this.commandSearcher.search(name, 20).find((cmd) => cmd.id.toLowerCase().includes(name.replace(" ", "-")) || cmd.name.toLowerCase().includes(name));
    if (!command || !this.commandSearcher.execute(command.id)) {
      new import_obsidian9.Notice(`Vault Spotlight: ${name} command not found.`);
      return;
    }
    this.close();
  }
  basesPowerPackApi() {
    const api = window.basesPowerPack;
    return api != null ? api : null;
  }
  /** Open a .base result in a Bases Power Pack view via its public API. */
  async handoffBaseToPowerPack(view, basePath) {
    const api = this.basesPowerPackApi();
    if (!(api == null ? void 0 : api.openView)) {
      new import_obsidian9.Notice("Vault Spotlight: update Bases Power Pack to 1.2.0+ to use this action.");
      return;
    }
    try {
      if (await api.openView(view, basePath)) this.close();
    } catch (err) {
      console.error("[VaultSpotlight] Bases Power Pack handoff failed", err);
      new import_obsidian9.Notice("Vault Spotlight: could not open the base in Bases Power Pack.");
    }
  }
  availableActions(context) {
    var _a;
    if (context.kind === "profile") {
      return [
        {
          id: "activate-profile",
          name: "Activate search profile",
          description: `Switch to ${context.name} and run its default query.`,
          requiresPro: true,
          run: () => this.activateProfile(context.id)
        },
        {
          id: "clear-profile",
          name: "Clear active profile",
          description: "Return Spotlight to the global search settings.",
          requiresPro: true,
          run: () => this.clearProfile()
        }
      ];
    }
    if (context.kind === "collection") {
      return [
        {
          id: "run-collection",
          name: "Run smart collection",
          description: context.query,
          run: () => {
            this.actionContext = null;
            this.inputEl.value = context.query;
            void this.runSearch();
          }
        },
        {
          id: "pin-collection",
          name: context.isPinned ? "Unpin smart collection" : "Pin smart collection",
          description: "Keep this saved search at the top of the browse view.",
          requiresPro: true,
          run: () => {
            this.plugin.togglePinnedCollection(context.id);
            this.closeActionPalette();
          }
        },
        {
          id: "copy-collection-query",
          name: "Copy collection query",
          description: "Copy the saved search query to the clipboard.",
          run: () => copyToClipboard(context.query, "Query copied")
        }
      ];
    }
    const file = itemFile(context);
    const actions = [];
    if (file) {
      actions.push(
        {
          id: "open",
          name: "Open",
          description: "Open the selected result.",
          run: async () => {
            this.close();
            await this.openItem(context, null);
            this.plugin.trackRecent(file.path);
          }
        },
        {
          id: "copy-link",
          name: "Copy link",
          description: "Copy a Markdown link for this result.",
          run: () => copyToClipboard(this.app.fileManager.generateMarkdownLink(file, ""), "Link copied")
        },
        {
          id: "copy-path",
          name: "Copy path",
          description: "Copy this file path.",
          run: () => copyToClipboard(file.path, "Path copied")
        },
        {
          id: "rename",
          name: "Rename",
          description: "Rename the selected note or file.",
          requiresPro: true,
          run: () => renameFile(this.app, file)
        },
        {
          id: "toggle-star",
          name: this.plugin.isStarred(file.path) ? "Unstar" : "Star",
          description: "Toggle the selected file in Starred pins.",
          requiresPro: true,
          run: () => {
            this.plugin.toggleStar(file.path);
            this.closeActionPalette();
          }
        }
      );
    }
    const integrations = this.installedSearchIntegrations();
    if (file && file.extension === "base" && integrations.basesPowerPack) {
      const api = this.basesPowerPackApi();
      if ((api == null ? void 0 : api.openView) && ((_a = api.isPremiumActive) == null ? void 0 : _a.call(api)) === true) {
        const views = [
          ["kanban", "Kanban"],
          ["calendar", "Calendar"],
          ["gantt", "Gantt"]
        ];
        for (const [view, label] of views) {
          actions.push({
            id: `open-base-${view}`,
            name: `Open in ${label} view`,
            description: `Open this base in Bases Power Pack's ${label} view.`,
            run: () => this.handoffBaseToPowerPack(view, file.path)
          });
        }
      }
    }
    actions.push(
      {
        id: "save-profile",
        name: "Save current setup as profile",
        description: "Create a Pro search profile from the current mode, query, preview, file type, and folder settings.",
        requiresPro: true,
        run: () => this.saveCurrentProfile()
      },
      {
        id: "copy-results",
        name: "Copy results as Markdown",
        description: "Copy selected results, or the current result list, as Markdown links.",
        requiresPro: true,
        run: () => copyResultsAsMarkdown(this.batchContext())
      },
      {
        id: "export-results",
        name: "Export results to note",
        description: "Create a Markdown note containing selected/search results.",
        requiresPro: true,
        run: () => exportResultsToNote(this.batchContext())
      },
      {
        id: "batch-add-tag",
        name: "Batch add tag",
        description: "Append a tag to selected Markdown files.",
        requiresPro: true,
        run: () => batchAddTag(this.batchContext())
      },
      {
        id: "batch-remove-tag",
        name: "Batch remove tag",
        description: "Remove a tag from selected Markdown files.",
        requiresPro: true,
        run: () => batchRemoveTag(this.batchContext())
      },
      {
        id: "batch-set-property",
        name: "Batch set property",
        description: "Set a frontmatter property on selected Markdown files.",
        requiresPro: true,
        run: () => batchSetProperty(this.batchContext())
      },
      {
        id: "batch-move",
        name: "Batch move files",
        description: "Move selected files into a target folder.",
        requiresPro: true,
        run: () => batchMoveFiles(this.batchContext())
      },
      {
        id: "batch-star",
        name: "Batch star results",
        description: "Add selected/current result files to Starred pins.",
        requiresPro: true,
        run: () => batchSetStarred(this.batchContext(), true)
      },
      {
        id: "batch-unstar",
        name: "Batch unstar results",
        description: "Remove selected/current result files from Starred pins.",
        requiresPro: true,
        run: () => batchSetStarred(this.batchContext(), false)
      },
      {
        id: "create-moc",
        name: "Create MOC from results",
        description: "Create a grouped index note from selected/current results.",
        requiresPro: true,
        run: () => createMocFromResults(this.batchContext())
      },
      {
        id: "append-links",
        name: "Append links to active note",
        description: "Append selected/current result links to the active Markdown note.",
        requiresPro: true,
        run: () => appendLinksToActiveNote(this.batchContext())
      }
    );
    if (integrations.omnisearch) {
      actions.push({
        id: "open-omnisearch",
        name: "Search in Omnisearch",
        description: "Hand off to the installed Omnisearch plugin.",
        requiresPro: true,
        run: () => this.runIntegrationCommand("omnisearch")
      });
    }
    if (integrations.textExtractor) {
      actions.push({
        id: "open-text-extractor",
        name: "Run Text Extractor",
        description: "Use the installed Text Extractor plugin for document/PDF text support.",
        requiresPro: true,
        run: () => this.runIntegrationCommand("text extractor")
      });
    }
    return actions;
  }
  resultItemsForBatch() {
    const allItems = this.actionContext ? this.resultSnapshot : this.items;
    const checked = allItems.filter((item) => {
      const file = itemFile(item);
      return file ? this.checkedPaths.has(file.path) : false;
    });
    const source = checked.length > 0 ? checked : allItems;
    return source.filter((item) => !!itemFile(item));
  }
  /**
   * Everything the extracted batch/export operations need from the modal —
   * see batchOps.ts, which owns the actual file-mutation logic.
   */
  batchContext() {
    return {
      app: this.app,
      plugin: this.plugin,
      resultItems: () => this.resultItemsForBatch(),
      exportQuery: () => this.actionReturnQuery || this.inputEl.value,
      close: () => this.close(),
      runSearch: () => void this.runSearch(),
      closeActionPalette: () => this.closeActionPalette()
    };
  }
  openActionsMenu(item, evt) {
    var _a;
    const file = itemFile(item);
    if (!file) return;
    const line = item.kind === "content" || item.kind === "heading" || item.kind === "symbol" ? item.line : null;
    const menu = new import_obsidian9.Menu();
    const openIn = (paneType) => {
      this.close();
      void (async () => {
        const leaf = this.app.workspace.getLeaf(paneType);
        await leaf.openFile(file);
        if (line !== null && file.extension === "md" && leaf.view instanceof import_obsidian9.MarkdownView) {
          leaf.view.editor.setCursor({ line: line - 1, ch: 0 });
        }
        this.plugin.trackRecent(file.path);
      })();
    };
    menu.addItem((i) => i.setTitle("Open in new tab").setIcon("file-plus").onClick(() => openIn("tab")));
    menu.addItem(
      (i) => i.setTitle("Open to the right").setIcon("separator-vertical").onClick(() => openIn("split"))
    );
    menu.addItem(
      (i) => i.setTitle("Open in new window").setIcon("picture-in-picture-2").onClick(() => openIn("window"))
    );
    menu.addSeparator();
    menu.addItem(
      (i) => i.setTitle("Copy Obsidian link").setIcon("link").onClick(() => {
        const link = this.app.fileManager.generateMarkdownLink(file, "");
        copyToClipboard(link, "Link copied");
      })
    );
    menu.addItem(
      (i) => i.setTitle("Copy path").setIcon("copy").onClick(() => copyToClipboard(file.path, "Path copied"))
    );
    menu.addItem(
      (i) => i.setTitle("Rename\u2026").setIcon("pencil").onClick(() => renameFile(this.app, file))
    );
    const showInFolder = this.app.showInFolder;
    if (typeof showInFolder === "function") {
      menu.addItem(
        (i) => i.setTitle("Show in system explorer").setIcon("folder-open").onClick(() => {
          showInFolder.call(this.app, file.path);
        })
      );
    }
    if (evt) {
      menu.showAtMouseEvent(evt);
    } else {
      const rect = (_a = this.resultsEl.querySelector(".is-selected")) == null ? void 0 : _a.getBoundingClientRect();
      if (rect) menu.showAtPosition({ x: rect.left + 40, y: rect.bottom });
      else menu.showAtPosition({ x: 100, y: 100 });
    }
  }
  saveCustomSearch() {
    const query = this.inputEl.value.trim();
    if (!query) return;
    new SaveSearchPromptModal(this.app, (name) => {
      const exists = this.plugin.settings.customSearches.some(
        (s) => s.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        new import_obsidian9.Notice("Vault Spotlight: a saved search with that name already exists.");
        return;
      }
      const entry = {
        id: typeof (crypto == null ? void 0 : crypto.randomUUID) === "function" ? crypto.randomUUID() : `cs-${Date.now()}`,
        name,
        query
      };
      this.plugin.settings.customSearches.push(entry);
      void this.plugin.saveSettings();
      this.plugin.registerCustomSearchCommand(entry);
    }).open();
  }
  recordSearch() {
    const raw = this.inputEl.value.trim();
    if (!raw) return;
    const { body } = this.resolveQuery(raw);
    if (body.length > 0) this.plugin.trackSearch(body);
  }
  updatePreview() {
    if (!this.preview.isMounted) return;
    const item = this.items[this.selectedIndex];
    this.preview.update(item ? itemFile(item) : null, this.previewHighlightTerms(item));
  }
  /** Terms to highlight in the preview for the current selection. */
  previewHighlightTerms(item) {
    if (!item) return [];
    if (item.kind === "heading") return [item.heading];
    if (item.kind === "symbol" && item.symbolType === "heading") return [item.text];
    if (item.kind === "content") {
      const { body } = this.resolveQuery(this.inputEl.value);
      return body.split(/\s+/).filter(Boolean);
    }
    return [];
  }
  registerScopeShortcuts() {
    this.scope.register([], "ArrowDown", (evt) => {
      evt.preventDefault();
      this.moveSelection(1);
      return false;
    });
    this.scope.register([], "ArrowUp", (evt) => {
      evt.preventDefault();
      this.moveSelection(-1);
      return false;
    });
    this.scope.register([], "Enter", (evt) => {
      evt.preventDefault();
      void this.activateSelection();
      return false;
    });
    this.scope.register(["Mod"], "Enter", (evt) => {
      evt.preventDefault();
      void this.activateSelection(this.plugin.settings.defaultNewTab ? null : "tab");
      return false;
    });
    this.scope.register(["Mod", "Alt"], "Enter", (evt) => {
      evt.preventDefault();
      void this.activateSelection("split");
      return false;
    });
    this.scope.register(["Alt"], "Enter", (evt) => {
      evt.preventDefault();
      const item = this.items[this.selectedIndex];
      if (item) this.openActionsMenu(item);
      return false;
    });
    this.scope.register(["Shift"], "Enter", (evt) => {
      evt.preventDefault();
      void this.createFromQuery();
      return false;
    });
    this.scope.register(["Mod"], "k", (evt) => {
      evt.preventDefault();
      this.openActionPalette();
      return false;
    });
    this.scope.register([], "Escape", (evt) => {
      evt.preventDefault();
      if (this.actionContext) this.closeActionPalette();
      else if (this.drillFile) this.exitDrill();
      else this.close();
      return false;
    });
    this.scope.register([], "Tab", (evt) => {
      evt.preventDefault();
      this.cycleMode();
      return false;
    });
    if (!this.plugin.settings.isPro) return;
    this.scope.register(["Mod"], " ", (evt) => {
      evt.preventDefault();
      this.toggleCheck();
      return false;
    });
    this.scope.register(["Mod"], "d", (evt) => {
      evt.preventDefault();
      this.toggleStarSelected();
      return false;
    });
    this.scope.register(["Mod"], "s", (evt) => {
      evt.preventDefault();
      if (canSaveWorkflowPreset(this.plugin.settings.workflowPresets, this.plugin.settings.isPro)) {
        this.saveCurrentWorkflow();
      } else {
        this.saveCustomSearch();
      }
      return false;
    });
  }
  clearFocusTimers() {
    for (const id of this.focusTimers) window.clearTimeout(id);
    this.focusTimers = [];
  }
  focusInput() {
    this.clearFocusTimers();
    const applyFocus = () => {
      var _a;
      if (!((_a = this.inputEl) == null ? void 0 : _a.isConnected)) return;
      if (this.inputEl.ownerDocument.activeElement === this.inputEl) return;
      this.inputEl.focus({ preventScroll: true });
      const end = this.inputEl.value.length;
      this.inputEl.setSelectionRange(end, end);
    };
    applyFocus();
    window.requestAnimationFrame(applyFocus);
    this.focusTimers.push(window.setTimeout(applyFocus, 0));
    this.focusTimers.push(window.setTimeout(applyFocus, 50));
  }
};

// src/shared/verifyLicense.mjs
var import_tweetnacl = __toESM(require_nacl_fast(), 1);
function verifyLicense(licenseKey, product, publicKeyB64) {
  const trimmed = String(licenseKey != null ? licenseKey : "").trim();
  if (!trimmed) {
    return { valid: false, error: "No license key provided." };
  }
  const parts = trimmed.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid license format." };
  }
  try {
    const payloadBytes = base64ToBytes(parts[0]);
    const signature = base64ToBytes(parts[1]);
    const publicKey = base64ToBytes(publicKeyB64);
    if (!import_tweetnacl.default.sign.detached.verify(payloadBytes, signature, publicKey)) {
      return { valid: false, error: "Invalid license signature." };
    }
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (payload.product !== product) {
      return { valid: false, error: "License is for a different product." };
    }
    return { valid: true, email: payload.email };
  } catch (e) {
    return { valid: false, error: "Could not parse license key." };
  }
}
function base64ToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// src/license/publicKey.ts
var LICENSE_PUBLIC_KEY = "8ybB+nBmz0Tiz5RYCYJsOgEW5+YmROAumf3HHPeC1E0=";

// src/license/LicenseManager.ts
var _LicenseManager = class _LicenseManager {
  static verify(licenseKey) {
    return verifyLicense(licenseKey, _LicenseManager.PRODUCT, LICENSE_PUBLIC_KEY);
  }
};
_LicenseManager.PRODUCT = "vault-spotlight";
var LicenseManager = _LicenseManager;

// src/search/ContentSearcher.ts
var import_obsidian11 = require("obsidian");

// src/search/RipgrepSearcher.ts
var import_obsidian10 = require("obsidian");
function getChildProcess() {
  try {
    const req = window.require;
    if (!req) return null;
    return req("child_process");
  } catch (e) {
    return null;
  }
}
function getEnv(name) {
  var _a, _b;
  try {
    const proc = window.process;
    return (_b = (_a = proc == null ? void 0 : proc.env) == null ? void 0 : _a[name]) != null ? _b : "";
  } catch (e) {
    return "";
  }
}
function candidateCommands(configured) {
  const candidates = [configured];
  if (configured !== "rg") candidates.push("rg");
  const home = getEnv("USERPROFILE") || getEnv("HOME");
  const localAppData = getEnv("LOCALAPPDATA");
  if (localAppData) {
    candidates.push(
      `${localAppData}\\Microsoft\\WinGet\\Links\\rg.exe`,
      `${localAppData}\\Programs\\Microsoft VS Code\\resources\\app\\node_modules\\@vscode\\ripgrep\\bin\\rg.exe`
    );
  }
  if (home) {
    candidates.push(`${home}\\scoop\\shims\\rg.exe`);
  }
  candidates.push(
    "C:\\ProgramData\\chocolatey\\bin\\rg.exe",
    "/opt/homebrew/bin/rg",
    "/usr/local/bin/rg",
    "/usr/bin/rg"
  );
  return Array.from(new Set(candidates));
}
var RipgrepSearcher = class {
  constructor(app, command) {
    this.app = app;
    this.command = command;
    /** The command that answered `--version`, or null when none did. */
    this.resolvedCommand = void 0;
    this.currentChild = null;
  }
  async isAvailable() {
    return await this.resolveCommand() !== null;
  }
  /**
   * Try the configured command, then well-known install locations, caching
   * whichever answers `--version` first.
   */
  async resolveCommand() {
    if (this.resolvedCommand !== void 0) return this.resolvedCommand;
    const cp = getChildProcess();
    if (!cp) {
      this.resolvedCommand = null;
      return null;
    }
    for (const candidate of candidateCommands(this.command)) {
      const ok = await new Promise((resolve) => {
        try {
          cp.execFile(
            candidate,
            ["--version"],
            { timeout: 3e3, windowsHide: true },
            (error) => resolve(!error)
          );
        } catch (e) {
          resolve(false);
        }
      });
      if (ok) {
        this.resolvedCommand = candidate;
        return candidate;
      }
    }
    this.resolvedCommand = null;
    return null;
  }
  /**
   * Returns matches, or `null` when ripgrep could not run at all (missing
   * binary, no vault path, or a non-"no-match" error). A `null` return is the
   * caller's signal to fall back to the in-memory index; an empty array means
   * ripgrep ran fine and genuinely found nothing — the caller should trust it
   * and NOT build a full-vault index just to also find nothing.
   */
  async search(query, options) {
    var _a;
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    const cp = getChildProcess();
    const command = await this.resolveCommand();
    if (!cp || !command) return null;
    const vaultPath = this.app.vault.adapter.basePath;
    if (!vaultPath) return null;
    const anchor = tokens.reduce((a, b) => b.length >= a.length ? b : a);
    const multi = tokens.length > 1;
    const args = [
      "-i",
      // Treat the query literally, matching the vault/canvas fallback's
      // String.includes semantics. Without this, regex metacharacters give
      // different (or invalid → empty) results depending on rg availability.
      "--fixed-strings",
      "--line-number",
      "--no-heading",
      "--color",
      "never",
      "--no-follow",
      // Vaults are often git repos with a .gitignore; without this rg
      // silently skips ignored notes that Obsidian itself still indexes,
      // so Pro users would see FEWER results than the free fallback.
      // (Hidden/dot folders stay skipped — matching Obsidian's indexing.)
      "--no-ignore",
      "--max-count",
      // A multi-word query needs more anchor hits per file to survive the
      // all-tokens filter below; a single word keeps the tight cap.
      multi ? "40" : "4",
      // Cap line length so a minified/one-line file can't blow maxBuffer.
      // `--max-columns-preview` still prints a usable prefix of an
      // over-long line instead of an "omitted" notice, so the AND filter
      // and snippet below see real text rather than a byte-count message.
      "--max-columns",
      "500",
      "--max-columns-preview",
      // Markdown only. Canvas (single-line JSON) and Bases (YAML) are
      // searched by their structure-aware searchers in ContentSearcher, not
      // by rg line globs that would mangle their snippets.
      "-g",
      "*.md"
    ];
    for (const folder of (_a = options.excludeFolders) != null ? _a : []) {
      const f = folder.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
      if (f) args.push("-g", `!${f}/**`);
    }
    args.push("--", anchor, ".");
    const needAll = multi ? tokens.map((t) => t.toLowerCase()) : null;
    if (this.currentChild) {
      this.currentChild.superseded = true;
      try {
        this.currentChild.kill();
      } catch (e) {
      }
      this.currentChild = null;
    }
    return new Promise((resolve) => {
      let child;
      try {
        child = cp.execFile(
          command,
          args,
          {
            cwd: vaultPath,
            timeout: 8e3,
            maxBuffer: 16 * 1024 * 1024,
            windowsHide: true
          },
          (error, stdout) => {
            if (this.currentChild === child) this.currentChild = null;
            if (!error) {
              resolve(this.parseOutput(String(stdout != null ? stdout : ""), options.limit, needAll));
              return;
            }
            if (error.code === 1) {
              resolve(this.parseOutput(String(stdout != null ? stdout : ""), options.limit, needAll));
              return;
            }
            if (child.superseded) {
              resolve([]);
              return;
            }
            resolve(null);
          }
        );
      } catch (e) {
        resolve(null);
        return;
      }
      this.currentChild = child;
    });
  }
  parseOutput(output, limit, needAll) {
    const results = [];
    const lines = output.split("\n").filter(Boolean);
    let suffixMap = null;
    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (!match) continue;
      const [, rawPath, lineNum, snippet] = match;
      if (needAll) {
        const low = snippet.toLowerCase();
        if (!needAll.every((tk) => low.includes(tk))) continue;
      }
      const normalized = rawPath.replace(/\\/g, "/").replace(/^\.\//, "");
      let file;
      const direct = this.app.vault.getAbstractFileByPath(normalized);
      if (direct instanceof import_obsidian10.TFile) {
        file = direct;
      } else {
        suffixMap != null ? suffixMap : suffixMap = this.buildSuffixMap();
        file = this.findFileBySuffix(suffixMap, normalized);
      }
      if (!file) continue;
      results.push({
        file,
        line: Number(lineNum),
        snippet: snippet.trim().slice(0, 160),
        // Gentle early-line preference with a floor — never negative, so a
        // late-line match can't sort below everything regardless of relevance.
        score: Math.max(1, 120 - Math.floor(Number(lineNum) / 10)),
        engine: "ripgrep"
      });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  buildSuffixMap() {
    const map = /* @__PURE__ */ new Map();
    for (const file of this.app.vault.getFiles()) {
      map.set(file.path, file);
    }
    return map;
  }
  findFileBySuffix(fileMap2, path) {
    const suffix = path.replace(/\\/g, "/");
    for (const [key, file] of fileMap2) {
      if (key === suffix || key.endsWith(`/${suffix}`) || suffix.endsWith(`/${key}`)) return file;
    }
    return void 0;
  }
};

// src/search/CanvasSearcher.ts
var CanvasSearcher = class {
  constructor(app) {
    this.app = app;
  }
  async search(tokens, limit = 20, excluded = []) {
    const needAll = tokens.map((t) => t.toLowerCase()).filter(Boolean);
    if (needAll.length === 0) return [];
    const results = [];
    const softCap = Math.max(limit * 10, 500);
    for (const file of this.app.vault.getFiles()) {
      if (file.extension !== "canvas") continue;
      if (isPathExcluded(file.path, excluded)) continue;
      let raw;
      try {
        raw = await this.app.vault.cachedRead(file);
      } catch (e) {
        continue;
      }
      const snippets = this.extractSearchableLines(raw);
      for (const { line, text } of snippets) {
        const low = text.toLowerCase();
        if (!needAll.every((tk) => low.includes(tk))) continue;
        results.push({
          file,
          line,
          snippet: text.slice(0, 160),
          // Slightly below markdown matches, floored so it never goes negative.
          score: Math.max(1, 90 - Math.floor(line / 10)),
          engine: "canvas"
        });
        if (results.length >= softCap) {
          results.sort((a, b) => b.score - a.score);
          results.length = limit;
        }
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  extractSearchableLines(raw) {
    const lines = [];
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data.nodes) ? data.nodes : [];
      nodes.forEach((node, index) => {
        var _a, _b;
        const value = (_b = (_a = node == null ? void 0 : node.text) != null ? _a : node == null ? void 0 : node.label) != null ? _b : "";
        const raw2 = typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
        const text = raw2.trim();
        if (text) {
          lines.push({ line: index + 1, text });
        }
      });
    } catch (e) {
      raw.split("\n").forEach((text, index) => {
        const trimmed = text.trim();
        if (trimmed) lines.push({ line: index + 1, text: trimmed });
      });
    }
    return lines;
  }
};

// src/search/BaseSearcher.ts
var BaseSearcher = class {
  constructor(app) {
    this.app = app;
  }
  async search(tokens, limit = 20, excluded = []) {
    const needAll = tokens.map((t) => t.toLowerCase()).filter(Boolean);
    if (needAll.length === 0) return [];
    const results = [];
    const softCap = Math.max(limit * 10, 500);
    for (const file of this.app.vault.getFiles()) {
      if (file.extension !== "base") continue;
      if (isPathExcluded(file.path, excluded)) continue;
      let raw;
      try {
        raw = await this.app.vault.cachedRead(file);
      } catch (e) {
        continue;
      }
      const lines = raw.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i].trim();
        if (!text) continue;
        const low = text.toLowerCase();
        if (!needAll.every((tk) => low.includes(tk))) continue;
        results.push({
          file,
          line: i + 1,
          snippet: text.slice(0, 160),
          // Slightly below markdown and canvas matches, floored so it
          // never goes negative.
          score: Math.max(1, 85 - Math.floor(i / 10)),
          engine: "base"
        });
        if (results.length >= softCap) {
          results.sort((a, b) => b.score - a.score);
          results.length = limit;
        }
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
};

// src/core/workerSource.mjs
var WORKER_SOURCE = `
const index = new Map();
self.onmessage = (evt) => {
	const msg = evt.data || {};
	if (msg.type === "set") {
		// Coerce defensively: a malformed message with non-string content would
		// otherwise throw here, fire onerror, and retire the worker for the whole
		// session.
		index.set(msg.path, String(msg.content == null ? "" : msg.content).split("\\n"));
	} else if (msg.type === "remove") {
		index.delete(msg.path);
	} else if (msg.type === "clear") {
		index.clear();
	} else if (msg.type === "search") {
		const tokens = msg.tokens || [];
		const excluded = msg.excluded || [];
		const limit = msg.limit || 40;
		// Bound memory without dropping the true top matches: a one-character
		// query matches nearly every line. Whenever the working set grows past a
		// soft cap, sort and keep only the current top \`limit\`; discarded rows
		// scored below every kept row so they can't belong in the final top-N.
		// This keeps the worker's result set identical to the in-process fallback.
		const softCap = Math.max(limit * 10, 500);
		const results = [];
		for (const entry of index) {
			const path = entry[0];
			const lines = entry[1];
			const p = path.toLowerCase();
			let skip = false;
			for (const f of excluded) {
				if (p === f || p.startsWith(f + "/")) { skip = true; break; }
			}
			if (skip) continue;
			for (let i = 0; i < lines.length; i++) {
				const low = lines[i].toLowerCase();
				let ok = true;
				for (const tk of tokens) {
					if (!low.includes(tk)) { ok = false; break; }
				}
				if (!ok) continue;
				results.push({
					path,
					line: i + 1,
					snippet: lines[i].trim().slice(0, 160),
					score: Math.max(1, 100 - Math.floor(i / 10)),
				});
				if (results.length >= softCap) {
					results.sort((a, b) => b.score - a.score);
					results.length = limit;
				}
			}
		}
		results.sort((a, b) => b.score - a.score);
		self.postMessage({ type: "results", id: msg.id, results: results.slice(0, limit) });
	}
};
`;

// src/search/WorkerIndex.ts
var SEARCH_TIMEOUT_MS = 15e3;
var WorkerIndex = class _WorkerIndex {
  constructor(app, worker, blobUrl) {
    this.app = app;
    this.worker = worker;
    this.blobUrl = blobUrl;
    this.built = false;
    this.buildPromise = null;
    // Bumped by invalidate(); a build that started under an older epoch must
    // not mark the index as complete (a mid-build "clear" wiped its early files).
    this.epoch = 0;
    this.nextId = 1;
    this.pending = /* @__PURE__ */ new Map();
    this.worker.onmessage = (evt) => {
      var _a;
      const msg = evt.data;
      if ((msg == null ? void 0 : msg.type) !== "results" || typeof msg.id !== "number") return;
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      entry.resolve((_a = msg.results) != null ? _a : []);
    };
    this.worker.onerror = () => this.failPending(new Error("content index worker error"));
    this.worker.onmessageerror = () => this.failPending(new Error("content index worker message error"));
  }
  /** Returns null when Workers/Blob URLs aren't available in this environment. */
  static create(app) {
    let url = null;
    try {
      url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
      const worker = new Worker(url);
      return new _WorkerIndex(app, worker, url);
    } catch (e) {
      if (url) URL.revokeObjectURL(url);
      return null;
    }
  }
  /**
   * Stream every markdown file into the worker once, coalescing concurrent
   * callers. Message ordering guarantees a search posted afterwards sees the
   * complete index.
   */
  ensureBuilt() {
    if (this.buildPromise) return this.buildPromise;
    if (this.built) return Promise.resolve();
    const epoch = this.epoch;
    this.buildPromise = (async () => {
      for (const file of this.app.vault.getMarkdownFiles()) {
        try {
          const content = await this.app.vault.cachedRead(file);
          this.worker.postMessage({ type: "set", path: file.path, content });
        } catch (e) {
        }
      }
      if (epoch === this.epoch) this.built = true;
    })().finally(() => {
      this.buildPromise = null;
    });
    return this.buildPromise;
  }
  async search(tokens, limit, excluded) {
    await this.ensureBuilt();
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = window.setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error("content index worker timed out"));
      }, SEARCH_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (rows) => {
          window.clearTimeout(timer);
          resolve(rows);
        },
        reject: (err) => {
          window.clearTimeout(timer);
          reject(err);
        }
      });
      try {
        this.worker.postMessage({ type: "search", id, tokens, limit, excluded });
      } catch (err) {
        window.clearTimeout(timer);
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
  async updateFile(file) {
    if (file.extension !== "md") return;
    if (this.buildPromise) await this.buildPromise;
    if (!this.built) return;
    try {
      const content = await this.app.vault.cachedRead(file);
      this.worker.postMessage({ type: "set", path: file.path, content });
    } catch (e) {
      this.worker.postMessage({ type: "remove", path: file.path });
    }
  }
  removeFile(path) {
    if (!this.built && !this.buildPromise) return;
    this.worker.postMessage({ type: "remove", path });
  }
  invalidate() {
    this.epoch++;
    this.built = false;
    this.worker.postMessage({ type: "clear" });
  }
  dispose() {
    this.failPending(new Error("content index worker disposed"));
    this.worker.terminate();
    URL.revokeObjectURL(this.blobUrl);
  }
  failPending(error) {
    for (const entry of Array.from(this.pending.values())) entry.reject(error);
    this.pending.clear();
  }
};

// src/search/ContentSearcher.ts
var ContentSearcher = class {
  constructor(app, ripgrepCommand = "rg") {
    this.app = app;
    this.index = /* @__PURE__ */ new Map();
    this.indexBuilt = false;
    this.buildPromise = null;
    // Bumped by invalidate(); a build that started under an older epoch must not
    // mark the index complete (a mid-build clear wiped its early files). Mirrors
    // the guard in WorkerIndex so both index paths survive a concurrent reset.
    this.indexEpoch = 0;
    // undefined = not tried yet; null = unavailable or died → in-process fallback.
    this.workerIndex = void 0;
    this.disposed = false;
    this.ripgrep = new RipgrepSearcher(app, ripgrepCommand);
    this.canvas = new CanvasSearcher(app);
    this.bases = new BaseSearcher(app);
  }
  getWorkerIndex() {
    if (this.workerIndex === void 0) {
      this.workerIndex = WorkerIndex.create(this.app);
    }
    return this.workerIndex;
  }
  /** Permanently drop a failed worker and use the in-process index instead. */
  retireWorker() {
    var _a;
    (_a = this.workerIndex) == null ? void 0 : _a.dispose();
    this.workerIndex = null;
  }
  setRipgrepCommand(command) {
    this.ripgrep = new RipgrepSearcher(this.app, command);
  }
  async search(query, options) {
    var _a;
    if (!query.trim()) return [];
    const limit = (_a = options.limit) != null ? _a : 40;
    const excluded = normalizeExcludeFolders(options.excludeFolders);
    const tokens = query.trim().split(/\s+/).filter(Boolean).map((t) => t.toLowerCase());
    if (tokens.length === 0) return [];
    const extraLimit = Math.max(10, Math.floor(limit / 2));
    const extras = [];
    if (options.includeCanvas) {
      extras.push(...await this.canvas.search(tokens, extraLimit, excluded));
    }
    if (options.includeBases) {
      extras.push(...await this.bases.search(tokens, extraLimit, excluded));
    }
    let base = null;
    if (options.useRipgrep) {
      base = await this.ripgrep.search(query, {
        excludeFolders: options.excludeFolders,
        limit
      });
    }
    if (base === null) base = await this.searchVaultIndex(tokens, limit, excluded);
    if (extras.length === 0) return base;
    return this.mergeResults(base, extras, limit);
  }
  async searchVaultIndex(tokens, limit, excluded) {
    const worker = this.getWorkerIndex();
    if (worker) {
      try {
        const rows = await worker.search(tokens, limit, excluded);
        const results2 = [];
        for (const row of rows) {
          const file = this.app.vault.getAbstractFileByPath(row.path);
          if (!(file instanceof import_obsidian11.TFile)) continue;
          results2.push({
            file,
            line: row.line,
            snippet: row.snippet,
            score: row.score,
            engine: "vault"
          });
        }
        return results2;
      } catch (err) {
        if (this.disposed) return [];
        console.warn("[VaultSpotlight] content index worker failed, falling back in-process", err);
        this.retireWorker();
      }
    }
    await this.ensureIndex();
    const results = [];
    const softCap = Math.max(limit * 10, 500);
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (isPathExcluded(file.path, excluded)) continue;
      const lines = this.index.get(file.path);
      if (!lines) continue;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const low = line.toLowerCase();
        if (!tokens.every((tk) => low.includes(tk))) continue;
        results.push({
          file,
          line: i + 1,
          snippet: line.trim().slice(0, 160),
          // Gentle early-line preference with a floor — a match on line
          // 5000 must still rank, never go negative.
          score: Math.max(1, 100 - Math.floor(i / 10)),
          engine: "vault"
        });
        if (results.length >= softCap) {
          results.sort((a, b) => b.score - a.score);
          results.length = limit;
        }
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  mergeResults(a, b, limit) {
    const seen = /* @__PURE__ */ new Set();
    const merged = [];
    for (const result of [...a, ...b].sort((x, y) => y.score - x.score)) {
      const key = `${result.file.path}:${result.line}:${result.snippet}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(result);
      if (merged.length >= limit) break;
    }
    return merged;
  }
  /** Full reset — use when the ripgrep command or global config changes. */
  invalidate() {
    var _a;
    (_a = this.workerIndex) == null ? void 0 : _a.invalidate();
    this.indexEpoch++;
    this.index.clear();
    this.indexBuilt = false;
    this.buildPromise = null;
  }
  /** Incremental: re-read a single changed/created file into the index. */
  async updateFile(file) {
    if (file.extension !== "md") return;
    if (this.workerIndex) {
      await this.workerIndex.updateFile(file);
    }
    if (this.buildPromise) await this.buildPromise;
    if (!this.indexBuilt) return;
    try {
      const content = await this.app.vault.cachedRead(file);
      this.index.set(file.path, content.split("\n"));
    } catch (e) {
      this.index.delete(file.path);
    }
  }
  /** Incremental: drop a deleted file from the index. */
  removeFile(path) {
    var _a;
    (_a = this.workerIndex) == null ? void 0 : _a.removeFile(path);
    this.index.delete(path);
  }
  /** Release the worker when the plugin unloads. */
  dispose() {
    var _a;
    this.disposed = true;
    (_a = this.workerIndex) == null ? void 0 : _a.dispose();
    this.workerIndex = null;
  }
  ensureIndex() {
    if (this.buildPromise) return this.buildPromise;
    if (this.indexBuilt) return Promise.resolve();
    const epoch = this.indexEpoch;
    this.buildPromise = (async () => {
      for (const file of this.app.vault.getMarkdownFiles()) {
        try {
          const content = await this.app.vault.cachedRead(file);
          this.index.set(file.path, content.split("\n"));
        } catch (e) {
        }
      }
      if (epoch === this.indexEpoch) this.indexBuilt = true;
    })().finally(() => {
      this.buildPromise = null;
    });
    return this.buildPromise;
  }
};

// src/main.ts
var MAX_FRECENCY_ENTRIES = 500;
function isSpotlightMode(value) {
  return typeof value === "string" && MODE_ORDER.includes(value);
}
var VaultSpotlightPlugin = class extends import_obsidian12.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.activeSpotlight = null;
    this.saveTimer = null;
    this.api = null;
    // Serialize writes: overlapping saveData calls (e.g. per-keystroke license
    // verification) could otherwise finish out of order, letting a stale
    // serialization win on disk.
    this.savePromise = Promise.resolve();
  }
  async onload() {
    await this.loadSettings();
    await this.refreshLicense();
    this.contentSearcher = new ContentSearcher(this.app, this.settings.ripgrepCommand);
    this.addRibbonIcon("search", "Vault Spotlight", () => this.openSpotlight());
    this.addCommand({
      id: "open-spotlight",
      name: "Open spotlight",
      callback: () => this.openSpotlight()
    });
    this.addCommand({
      id: "search-contents",
      name: "Search file contents",
      callback: () => this.openSpotlight("", "content")
    });
    this.addCommand({
      id: "go-to-heading",
      name: "Go to heading",
      callback: () => this.openSpotlight("", "headings")
    });
    this.addCommand({
      id: "run-action",
      name: "Run action",
      callback: () => this.openSpotlight("", "commands")
    });
    this.addCommand({
      id: "go-to-symbol",
      name: "Go to symbol in active note",
      callback: () => this.openSpotlight("", "symbols")
    });
    this.addCommand({
      id: "open-editors",
      name: "Switch between open editors",
      callback: () => this.openSpotlight("", "editors")
    });
    this.addCommand({
      id: "browse-folders",
      name: "Browse folders",
      callback: () => this.openSpotlight("", "folders")
    });
    this.addCommand({
      id: "browse-links",
      name: "Browse backlinks and outlinks",
      callback: () => this.openSpotlight("", "links")
    });
    this.addCommand({
      id: "switch-to-last-file",
      name: "Switch to last file",
      callback: () => void this.switchToLastFile()
    });
    this.addCommand({
      id: "toggle-star-current-file",
      name: "Toggle star on current file",
      checkCallback: (checking) => {
        if (!this.settings.isPro) return false;
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) this.toggleStar(file.path);
        return true;
      }
    });
    if (this.settings.isPro) {
      for (const search of this.settings.customSearches) {
        this.registerCustomSearchCommand(search);
      }
    }
    this.app.workspace.onLayoutReady(() => {
      this.registerEvent(
        this.app.vault.on("modify", (file) => {
          if (file instanceof import_obsidian12.TFile) void this.contentSearcher.updateFile(file);
        })
      );
      this.registerEvent(
        this.app.vault.on("create", (file) => {
          if (file instanceof import_obsidian12.TFile) void this.contentSearcher.updateFile(file);
        })
      );
      this.registerEvent(
        this.app.vault.on("delete", (file) => {
          this.contentSearcher.removeFile(file.path);
          this.untrackPath(file.path);
        })
      );
      this.registerEvent(
        this.app.vault.on("rename", (file, oldPath) => {
          this.contentSearcher.removeFile(oldPath);
          if (file instanceof import_obsidian12.TFile) void this.contentSearcher.updateFile(file);
          this.renamePath(oldPath, file.path);
        })
      );
      this.registerEvent(
        this.app.workspace.on("file-open", (file) => {
          if (file) this.trackRecent(file.path);
        })
      );
    });
    this.registerObsidianProtocolHandler("vault-spotlight", (params) => {
      var _a;
      const mode = isSpotlightMode(params.mode) ? params.mode : "files";
      this.openSpotlight((_a = params.query) != null ? _a : "", mode);
    });
    this.api = this.createApi();
    window.vaultSpotlight = this.api;
    this.addSettingTab(new VaultSpotlightSettingTab(this.app, this));
  }
  onunload() {
    var _a, _b;
    (_a = this.activeSpotlight) == null ? void 0 : _a.close();
    this.activeSpotlight = null;
    (_b = this.contentSearcher) == null ? void 0 : _b.dispose();
    const globals = window;
    if (this.api && globals.vaultSpotlight === this.api) delete globals.vaultSpotlight;
    this.api = null;
    this.flushSave();
  }
  /**
   * Public API exposed as `globalThis.vaultSpotlight` so other plugins,
   * scripts, and external tools can build on Spotlight.
   */
  createApi() {
    return {
      open: (query = "", mode = "files") => {
        this.openSpotlight(query, isSpotlightMode(mode) ? mode : "files");
      },
      search: async (query) => {
        if (!this.settings.isPro) {
          console.warn("[VaultSpotlight] api.search requires a Pro license.");
          return [];
        }
        const results = await this.contentSearcher.search(query, {
          useRipgrep: true,
          includeCanvas: this.settings.includeCanvas,
          includeBases: this.settings.includeBases,
          excludeFolders: this.settings.excludeFolders
        });
        return results.map((r) => ({
          path: r.file.path,
          basename: r.file.basename,
          line: r.line,
          snippet: r.snippet,
          score: r.score,
          engine: r.engine
        }));
      },
      isProActive: () => this.settings.isPro
    };
  }
  openSpotlight(initialQuery = "", initialMode = "files") {
    var _a;
    (_a = this.activeSpotlight) == null ? void 0 : _a.close();
    this.activeSpotlight = new SpotlightModal(this.app, this, initialQuery, initialMode);
    this.activeSpotlight.open();
  }
  onSpotlightClosed(modal) {
    if (this.activeSpotlight === modal) {
      this.activeSpotlight = null;
    }
  }
  registerCustomSearchCommand(search) {
    this.addCommand({
      id: `custom-search-${search.id}`,
      name: search.name,
      callback: () => this.openSpotlight(search.query)
    });
  }
  deleteCustomSearch(id) {
    var _a;
    this.settings.customSearches = this.settings.customSearches.filter((s) => s.id !== id);
    this.settings.pinnedCustomSearchIds = this.settings.pinnedCustomSearchIds.filter((pinnedId) => pinnedId !== id);
    const commands = this.app.commands;
    (_a = commands == null ? void 0 : commands.removeCommand) == null ? void 0 : _a.call(commands, `${this.manifest.id}:custom-search-${id}`);
    void this.saveSettings();
  }
  togglePinnedCollection(id) {
    if (!this.settings.isPro) return false;
    if (this.settings.pinnedCustomSearchIds.includes(id)) {
      this.settings.pinnedCustomSearchIds = this.settings.pinnedCustomSearchIds.filter((pinnedId) => pinnedId !== id);
      void this.saveSettings();
      return false;
    }
    this.settings.pinnedCustomSearchIds = [id, ...this.settings.pinnedCustomSearchIds.filter((pinnedId) => pinnedId !== id)];
    void this.saveSettings();
    return true;
  }
  trackRecent(path) {
    if (this.settings.recentPaths[0] !== path) {
      const recent = this.settings.recentPaths.filter((p) => p !== path);
      recent.unshift(path);
      this.settings.recentPaths = recent.slice(0, this.settings.maxRecent);
    }
    this.bumpFrecency(path);
    this.scheduleSave();
  }
  /** Open the most recent file that isn't the active one (quick file toggle). */
  async switchToLastFile() {
    var _a;
    const active = this.app.workspace.getActiveFile();
    const path = previousFilePath(this.settings.recentPaths, (_a = active == null ? void 0 : active.path) != null ? _a : "");
    const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
    if (!(file instanceof import_obsidian12.TFile)) {
      new import_obsidian12.Notice("Vault Spotlight: no previous file yet.");
      return;
    }
    await this.app.workspace.getLeaf(false).openFile(file);
    this.trackRecent(file.path);
  }
  /** Record an executed command so it resurfaces on an empty command query. */
  trackCommand(id) {
    this.settings.recentCommandIds = pushRecentCommand(this.settings.recentCommandIds, id, MAX_RECENT_COMMANDS);
    this.scheduleSave();
  }
  /** Record a query in the recent-searches list (most-recent first, de-duped). */
  trackSearch(query) {
    const q = query.trim();
    if (!q) return;
    const next = this.settings.recentSearches.filter((s) => s.toLowerCase() !== q.toLowerCase());
    next.unshift(q);
    this.settings.recentSearches = next.slice(0, MAX_RECENT_SEARCHES);
    this.scheduleSave();
  }
  /**
   * File paths from Obsidian's core Bookmarks plugin (flattened across groups).
   * The bookmarks API isn't in the public typings, so it's read defensively and
   * returns [] whenever the plugin is disabled or the shape is unexpected.
   */
  getBookmarkedPaths() {
    var _a, _b, _c;
    try {
      const internal = this.app.internalPlugins;
      const instance = (_b = (_a = internal == null ? void 0 : internal.getPluginById) == null ? void 0 : _a.call(internal, "bookmarks")) == null ? void 0 : _b.instance;
      const bookmarks = (_c = instance == null ? void 0 : instance.getBookmarks) == null ? void 0 : _c.call(instance);
      if (!Array.isArray(bookmarks)) return [];
      const paths = [];
      const walk = (items) => {
        for (const raw of items) {
          const item = raw;
          if ((item == null ? void 0 : item.type) === "file" && typeof item.path === "string") {
            paths.push(item.path);
          } else if (Array.isArray(item == null ? void 0 : item.items)) {
            walk(item.items);
          }
        }
      };
      walk(bookmarks);
      return paths;
    } catch (e) {
      return [];
    }
  }
  bumpFrecency(path) {
    var _a;
    const fr = this.settings.fileFrecency;
    const entry = (_a = fr[path]) != null ? _a : { count: 0, last: 0 };
    entry.count += 1;
    entry.last = Date.now();
    fr[path] = entry;
    this.pruneFrecency();
  }
  pruneFrecency() {
    const keys = Object.keys(this.settings.fileFrecency);
    if (keys.length <= MAX_FRECENCY_ENTRIES) return;
    const sorted = keys.sort(
      (a, b) => this.settings.fileFrecency[b].last - this.settings.fileFrecency[a].last
    );
    const next = {};
    for (const key of sorted.slice(0, MAX_FRECENCY_ENTRIES)) {
      next[key] = this.settings.fileFrecency[key];
    }
    this.settings.fileFrecency = next;
  }
  toggleStar(path) {
    if (!this.settings.isPro) return false;
    if (this.settings.starredPaths.includes(path)) {
      this.settings.starredPaths = this.settings.starredPaths.filter((p) => p !== path);
      void this.saveSettings();
      return false;
    }
    const starred = this.settings.starredPaths.filter((p) => p !== path);
    starred.unshift(path);
    this.settings.starredPaths = starred.slice(0, this.settings.maxStarred);
    void this.saveSettings();
    return true;
  }
  isStarred(path) {
    return this.settings.starredPaths.includes(path);
  }
  untrackPath(path) {
    this.settings.recentPaths = this.settings.recentPaths.filter((p) => p !== path);
    this.settings.starredPaths = this.settings.starredPaths.filter((p) => p !== path);
    delete this.settings.fileFrecency[path];
    void this.saveSettings();
  }
  renamePath(oldPath, newPath) {
    const swap = (arr) => arr.map((p) => p === oldPath ? newPath : p);
    this.settings.recentPaths = swap(this.settings.recentPaths);
    this.settings.starredPaths = swap(this.settings.starredPaths);
    const fr = this.settings.fileFrecency;
    if (fr[oldPath]) {
      fr[newPath] = fr[oldPath];
      delete fr[oldPath];
    }
    this.scheduleSave();
  }
  /**
   * Re-verify the license key (offline) and cache the result.
   *
   * `persistUnchanged` is for the settings tab, where the key TEXT was just
   * edited: it must be saved even when the Pro status didn't flip, or an
   * invalid/typo'd key silently vanishes on the next restart. Startup calls
   * leave it false so an unchanged verification never writes data.json.
   */
  async refreshLicense(persistUnchanged = false) {
    var _a;
    const before = this.settings.isPro;
    const beforeEmail = this.settings.licenseEmail;
    if (!this.settings.licenseKey) {
      if (!this.settings.isPro && !this.settings.licenseEmail) {
        if (persistUnchanged) await this.saveSettings();
        return false;
      }
      this.settings.isPro = false;
      this.settings.licenseEmail = "";
      await this.saveSettings();
      return before !== this.settings.isPro;
    }
    const result = LicenseManager.verify(this.settings.licenseKey);
    this.settings.isPro = result.valid;
    this.settings.licenseEmail = (_a = result.email) != null ? _a : "";
    const changed = before !== this.settings.isPro || beforeEmail !== this.settings.licenseEmail;
    if (changed || persistUnchanged) await this.saveSettings();
    return changed;
  }
  async loadSettings() {
    var _a;
    const data = await this.loadData();
    const loaded = data !== null && typeof data === "object" ? data : {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    if (!Array.isArray(this.settings.recentPaths)) this.settings.recentPaths = [];
    if (!Array.isArray(this.settings.starredPaths)) this.settings.starredPaths = [];
    if (!Array.isArray(this.settings.pinnedCustomSearchIds)) this.settings.pinnedCustomSearchIds = [];
    this.settings.workflowPresets = normalizeWorkflowPresets(this.settings.workflowPresets);
    this.settings.searchProfiles = normalizeProfiles(this.settings.searchProfiles);
    this.settings.ranking = normalizeRankingSettings(this.settings.ranking);
    if (typeof this.settings.searchAliases !== "string") this.settings.searchAliases = "";
    if (!this.settings.searchProfiles.some((profile) => profile.id === this.settings.activeProfileId)) {
      this.settings.activeProfileId = "";
    }
    if (!Array.isArray(this.settings.excludeFolders)) this.settings.excludeFolders = [];
    if (!Array.isArray(this.settings.recentSearches)) {
      this.settings.recentSearches = [];
    } else {
      this.settings.recentSearches = this.settings.recentSearches.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, MAX_RECENT_SEARCHES);
    }
    if (this.settings.fileFrecency === null || typeof this.settings.fileFrecency !== "object") {
      this.settings.fileFrecency = {};
    }
    this.settings.modePrefixes = normalizeModePrefixes(this.settings.modePrefixes);
    this.settings.escapeChar = normalizeEscapeChar(this.settings.escapeChar);
    const takenPrefixes = new Set(Object.values(this.settings.modePrefixes));
    if (takenPrefixes.has(this.settings.escapeChar)) {
      this.settings.escapeChar = takenPrefixes.has(DEFAULT_ESCAPE_CHAR) ? (_a = ["\\", "|", "?", "%", "&"].find((c) => !takenPrefixes.has(c))) != null ? _a : DEFAULT_ESCAPE_CHAR : DEFAULT_ESCAPE_CHAR;
    }
    this.settings.defaultNewTab = this.settings.defaultNewTab === true;
    this.settings.enableCalculator = this.settings.enableCalculator !== false;
    this.settings.enableDateJump = this.settings.enableDateJump !== false;
    if (typeof this.settings.currencyRates !== "string") this.settings.currencyRates = "";
    if (typeof this.settings.captureInboxPath !== "string") this.settings.captureInboxPath = "";
    if (typeof this.settings.captureHeading !== "string") this.settings.captureHeading = "";
    this.settings.captureMode = this.settings.captureMode === "prepend" ? "prepend" : "append";
    this.settings.snippets = normalizeSnippets(this.settings.snippets);
    this.settings.recentCommandIds = (Array.isArray(this.settings.recentCommandIds) ? this.settings.recentCommandIds : []).filter((id) => typeof id === "string" && id.length > 0).slice(0, MAX_RECENT_COMMANDS);
    this.settings.maxRecent = coercePositiveInt(this.settings.maxRecent, DEFAULT_SETTINGS.maxRecent);
    this.settings.maxStarred = coercePositiveInt(this.settings.maxStarred, DEFAULT_SETTINGS.maxStarred);
    if (!Array.isArray(this.settings.customSearches)) {
      this.settings.customSearches = [];
    } else {
      this.settings.customSearches = this.settings.customSearches.filter(
        (s) => !!s && typeof s.id === "string" && s.id.length > 0 && typeof s.name === "string" && typeof s.query === "string"
      ).slice(0, MAX_CUSTOM_SEARCHES);
    }
    const customSearchIds = new Set(this.settings.customSearches.map((search) => search.id));
    this.settings.pinnedCustomSearchIds = this.settings.pinnedCustomSearchIds.filter((id) => typeof id === "string" && customSearchIds.has(id));
    this.settings.workflowPresets = this.settings.workflowPresets.slice(0, 25);
    this.settings.recentPaths = this.settings.recentPaths.slice(0, this.settings.maxRecent);
    this.settings.starredPaths = this.settings.starredPaths.slice(0, this.settings.maxStarred);
  }
  scheduleSave() {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.saveSettings();
    }, 1500);
  }
  flushSave() {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
      void this.saveSettings();
    }
  }
  async saveSettings() {
    this.savePromise = this.savePromise.then(async () => {
      try {
        await this.saveData(this.settings);
      } catch (err) {
        console.error("[VaultSpotlight] failed to save settings", err);
      }
    });
    return this.savePromise;
  }
};
function coercePositiveInt(value, fallback) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
