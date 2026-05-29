import React from 'react';

// SVG QWERTY teclado con dedos coloreados.
// Prop highlight: array de keys ['leftPinky','leftRing','leftMiddle','leftIndex',
// 'rightIndex','rightMiddle','rightRing','rightPinky','leftThumb','rightThumb']

const FINGER_COLOR = {
  leftPinky:   '#ff7ab6',
  leftRing:    '#ffaa66',
  leftMiddle:  '#ffe066',
  leftIndex:   '#7be38b',
  rightIndex:  '#7be38b',
  rightMiddle: '#ffe066',
  rightRing:   '#ffaa66',
  rightPinky:  '#ff7ab6',
  leftThumb:   '#00ffcc',
  rightThumb:  '#00ffcc',
};

const FINGER_OF_KEY = {
  '1':'leftPinky',  'q':'leftPinky',  'a':'leftPinky',  'z':'leftPinky',
  '2':'leftRing',   'w':'leftRing',   's':'leftRing',   'x':'leftRing',
  '3':'leftMiddle', 'e':'leftMiddle', 'd':'leftMiddle', 'c':'leftMiddle',
  '4':'leftIndex',  'r':'leftIndex',  'f':'leftIndex',  'v':'leftIndex',
  '5':'leftIndex',  't':'leftIndex',  'g':'leftIndex',  'b':'leftIndex',
  '6':'rightIndex', 'y':'rightIndex', 'h':'rightIndex', 'n':'rightIndex',
  '7':'rightIndex', 'u':'rightIndex', 'j':'rightIndex', 'm':'rightIndex',
  '8':'rightMiddle','i':'rightMiddle','k':'rightMiddle',',':'rightMiddle',
  '9':'rightRing',  'o':'rightRing',  'l':'rightRing',  '.':'rightRing',
  '0':'rightPinky', 'p':'rightPinky', 'ñ':'rightPinky', '-':'rightPinky',
  ' ':'thumb',
};

const ROWS = [
  ['1','2','3','4','5','6','7','8','9','0','-'],
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l','ñ'],
  ['z','x','c','v','b','n','m',',','.'],
];

export default function TypingDiagram({ highlight = [] }) {
  const hl = new Set(highlight);
  const keyColor = (k) => {
    const f = FINGER_OF_KEY[k];
    if (!f) return 'rgba(255,255,255,0.04)';
    if (!hl.size) return 'rgba(255,255,255,0.06)';
    return hl.has(f) ? FINGER_COLOR[f] + 'cc' : 'rgba(255,255,255,0.05)';
  };
  const keyStroke = (k) => {
    const f = FINGER_OF_KEY[k];
    if (!f || !hl.size) return 'rgba(255,255,255,0.18)';
    return hl.has(f) ? FINGER_COLOR[f] : 'rgba(255,255,255,0.14)';
  };

  const W = 36, H = 36, GAP = 4;
  return (
    <svg viewBox="0 0 420 200" width="100%" className="tut-keyboard">
      {ROWS.map((row, ri) => row.map((k, ki) => {
        const x = ki * (W + GAP) + ri * 12 + 8;
        const y = ri * (H + GAP) + 8;
        return (
          <g key={`${ri}-${ki}`}>
            <rect x={x} y={y} width={W} height={H} rx="4"
              fill={keyColor(k)} stroke={keyStroke(k)} strokeWidth="1.2" />
            <text x={x + W/2} y={y + H/2 + 4} textAnchor="middle"
              fontSize="13" fill="rgba(255,255,255,0.85)"
              fontFamily="ui-monospace, monospace">{k.toUpperCase()}</text>
          </g>
        );
      }))}
      {/* Space bar */}
      <rect x="80" y={4 * (H + GAP) + 8} width="240" height="22" rx="4"
        fill={hl.has('leftThumb') || hl.has('rightThumb') ? '#00ffcccc' : 'rgba(255,255,255,0.06)'}
        stroke={hl.has('leftThumb') || hl.has('rightThumb') ? '#00ffcc' : 'rgba(255,255,255,0.14)'}
        strokeWidth="1.2" />
      <text x="200" y={4 * (H + GAP) + 24} textAnchor="middle" fontSize="10"
        fill="rgba(255,255,255,0.7)" fontFamily="ui-monospace, monospace">SPACE</text>
    </svg>
  );
}
