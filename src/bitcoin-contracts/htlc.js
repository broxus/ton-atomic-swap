const op = require('btc-opcode').map;
const { decode, encode } = require('./segwit');
const bitcoin = require('bitcoinjs-lib');
const bs58check = require('bs58check');


const TESTNET_VERSION_PREFIX = 196;
const MAINNET_VERSION_PREFIX = 5;
const TESTNET_SEGWIT_ADDR_PREFIX = 'tb';
const MAINNET_SEGWIT_ADDR_PREFIX = 'bc';
const OP_CHECKLOCKTIMEVERIFY = 177;

function isEven(num) { return ((num % 2) === 0); }

function addPadding(str, required_len) {
    return "0".repeat(required_len - str.length) + str;
}

function toPaddedHexString(num, len) {
    str = num.toString(16);
    return addPadding(str, len);
}

function add_varInt(value) {
    var value_len = value.length;
    if (!isEven(value_len)) {
        value_len += 1;
    }
    var padded_value = addPadding(value, value_len);
    value_len = value_len / 2;
    if (value_len <= 75) {
        return toPaddedHexString(value_len, 2) + padded_value;
    } else if (value_len <= 255) {
        return toPaddedHexString(op.OP_PUSHDATA1, 2) + toPaddedHexString(value_len, 2) + padded_value;
    } else if (value_len <= 65535) {
        return toPaddedHexString(op.OP_PUSHDATA2, 2) + toPaddedHexString(value_len, 4) + padded_value
    }

    throw `Value too big: ${value_len}`;
}

function serializeScript(script_arr) {
    const serialized = script_arr.map((elem) => {
        if (typeof elem === "number" && elem >= 0 && elem <= 255) {
            return toPaddedHexString(elem, 2);
        } else if (typeof elem === 'string') {
            return add_varInt(elem);
        } else {
            throw `Unexpected elem in script: ${elem}`;
        }
    });

    return serialized.join('');
}

function htlc(timelock, payer_addr, receiver_addr, hash_) {
    var buf = Buffer.allocUnsafe(4);
    buf.writeUInt32LE(timelock);
    const timelock_hex = buf.toString('hex');
    const payer_hashed_pubkey = decode(MAINNET_SEGWIT_ADDR_PREFIX, payer_addr).program.map(i => toPaddedHexString(i, 2)).join('');
    const receiver_hashed_pubkey = decode(MAINNET_SEGWIT_ADDR_PREFIX, receiver_addr).program.map(i => toPaddedHexString(i, 2)).join('');

    var script = [op.OP_SHA256, hash_, op.OP_EQUAL];
    script = [...script, ...[op.OP_IF, op.OP_DUP, op.OP_HASH160, receiver_hashed_pubkey, op.OP_EQUALVERIFY, op.OP_CHECKSIG]];
    script = [...script, ...[op.OP_ELSE, timelock_hex, OP_CHECKLOCKTIMEVERIFY, op.OP_DROP]];
    script = [...script, ...[op.OP_DUP, op.OP_HASH160, payer_hashed_pubkey, op.OP_EQUALVERIFY, op.OP_CHECKSIG, op.OP_ENDIF]];

    return serializeScript(script);
}

function script_to_p2sh_addr(script) {
    const hashed_script = toPaddedHexString(MAINNET_VERSION_PREFIX.toString(16), 2) + bitcoin.crypto.hash160(Buffer.from(script, 'hex')).toString('hex');
    return bs58check.encode(Buffer.from(hashed_script, 'hex'));
}

module.exports = { htlc, serializeScript, toPaddedHexString, addPadding, add_varInt, script_to_p2sh_addr };
