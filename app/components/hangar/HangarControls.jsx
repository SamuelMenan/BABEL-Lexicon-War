import React from 'react';

const NUMBER_FORMATTER = new Intl.NumberFormat('es-ES');
function formatN(n) {
  return NUMBER_FORMATTER.format(n ?? 0);
}

export default function HangarControls({
  onConfirm, onCancel,
  onPurchase, onEquip,
  onOpenCharSelect, character,
  idx, total,
  owned, equipped, canBuy, price, missing,
}) {
  let actionBtn;
  if (!owned) {
    const tooltip = canBuy ? '' : `Faltan ${formatN(missing)} ₲`;
    actionBtn = (
      <button
        className={`hangar-controls__btn hangar-controls__btn--buy${canBuy ? '' : ' hangar-controls__btn--disabled'}`}
        onClick={canBuy ? onPurchase : undefined}
        disabled={!canBuy}
        title={tooltip}
      >
        COMPRAR · ₲ {formatN(price)}
      </button>
    );
  } else if (!equipped) {
    actionBtn = (
      <button className="hangar-controls__btn hangar-controls__btn--equip" onClick={onEquip}>
        EQUIPAR
      </button>
    );
  } else {
    actionBtn = (
      <button className="hangar-controls__btn hangar-controls__btn--confirm" onClick={onConfirm}>
        DESPLEGAR · NAVE
      </button>
    );
  }

  return (
    <div className="hangar-controls">
      <div className="hangar-controls__dots">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`hangar-controls__dot${i === idx ? ' hangar-controls__dot--active' : ''}`}
          />
        ))}
      </div>

      <div className="hangar-controls__btn-row">
        {onOpenCharSelect && (
          <button
            className="hangar-controls__btn hangar-controls__btn--secondary"
            onClick={onOpenCharSelect}
            title="Elegir piloto"
          >
            PILOTO · {(character?.name || '—').toUpperCase()}
          </button>
        )}
        <button className="hangar-controls__btn hangar-controls__btn--danger" onClick={onCancel}>
          VOLVER
        </button>
        {actionBtn}
      </div>

      <p className="hangar-controls__hints">
        ←/→ CAMBIAR NAVE · WASD ROTAR CÁMARA · C VISTAS · R RESET · ESC VOLVER · ↵ {owned ? (equipped ? 'DESPLEGAR' : 'EQUIPAR') : 'COMPRAR'} · ? ATAJOS
      </p>
    </div>
  );
}
