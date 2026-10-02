/* Ambient animal looks (fed to buildQuad in src/models/creatures.js) and their behaviour kind. */

export const CRITTER_DEFS = {
  catOrange: { kind: 'cat', fur: 0xffa65c, belly: 0xfff0dc, ear: 'point', tail: 'cat', tailCol: 0xff9444, len: 0.95, leg: 0.2, snout: 0.8 },
  catGrey: { kind: 'cat', fur: 0xa6abc8, belly: 0xffffff, ear: 'point', tail: 'cat', len: 0.95, leg: 0.2, snout: 0.8 },
  catBlack: { kind: 'cat', fur: 0x3e3656, belly: 0x5a5078, ear: 'point', tail: 'cat', len: 0.95, leg: 0.2, snout: 0.8, eye: 0xffe066, eyeGlow: true },
  dogShiba: { kind: 'dog', fur: 0xf0a860, belly: 0xfff4e6, ear: 'point', tail: 'curl', len: 1.05, leg: 0.26, snout: 1.25, w: 1.1 },
  dogGold: { kind: 'dog', fur: 0xe8c07a, belly: 0xfff4e6, ear: 'flop', earCol: 0xc99a58, tail: 'curl', len: 1.1, leg: 0.27, snout: 1.3, w: 1.15 },
  wolf: { kind: 'wolf', fur: 0x8f97ad, belly: 0xeef0f6, ear: 'big', earCol: 0x7d859a, tail: 'fox', tip: 0xbfe6ff, len: 1.25, leg: 0.3, snout: 1.45, w: 1.15, paw: 0x5a6070, eye: 0x7fd6ff, eyeGlow: true },
  fox: { kind: 'fox', fur: 0xff8c4a, belly: 0xfff4ea, ear: 'big', earCol: 0xff8c4a, tail: 'fox', tip: 0xc7a8ff, len: 1.05, leg: 0.24, snout: 1.35, paw: 0x5a3a4a },
};
