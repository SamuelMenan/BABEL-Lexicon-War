import React from 'react';

// Wrapper para Material Symbols Outlined. Carga la fuente via index.html.
// Uso: <Icon name="close" />  |  <Icon name="lock" size={18} />
// Props:
//   name  — string  (ej. 'close', 'visibility', 'warning')
//   size  — number  (px, opcional; default = font-size del contenedor)
//   className — string (extra)
export default function Icon({ name, size, className = '', style, ...rest }) {
  const cls = `material-symbols-outlined icon${className ? ' ' + className : ''}`;
  const inline = size ? { fontSize: `${size}px`, ...style } : style;
  return (
    <span className={cls} style={inline} aria-hidden="true" {...rest}>{name}</span>
  );
}
