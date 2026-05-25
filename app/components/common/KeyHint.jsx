import React from 'react';

// Componente unificado para mostrar prompts de teclas en toda la UI.
// Patron: tecla en cyan + texto en gris, separadas por punto medio.
//
// Uso:
//   <KeyHint items={[
//     { key: '↑↓',     label: 'navegar' },
//     { key: 'Enter',  label: 'elegir' },
//     { key: 'ESC',    label: 'cerrar' },
//   ]} />
//
// className opcional anyade clase wrapper (para overrides de posicion).
export default function KeyHint({ items = [], className = '' }) {
  return (
    <span className={`key-hint ${className}`.trim()}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="key-hint__sep">·</span>}
          <span className="key-hint__pair">
            <span className="key-hint__key">{it.key}</span>
            <span className="key-hint__label">{it.label}</span>
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}
