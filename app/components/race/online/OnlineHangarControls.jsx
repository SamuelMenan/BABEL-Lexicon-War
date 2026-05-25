import React from 'react';
import KeyHint from '../../common/KeyHint.jsx';
import Icon from '../../common/Icon.jsx';
import useTranslation from '../../../../shared/i18n/useTranslation.js';

export default function OnlineHangarControls({
  myShip, myReady, otherReady, status, roomCode, connection = 'connected',
  onToggleReady, onLeave,
}) {
  const { t } = useTranslation();
  const canReady = !!myShip && status === 'lobby';
  const isDeploying = status === 'starting';

  let hint = '';
  if (!myShip)                       hint = t('race.hangar.selectShip');
  else if (!myReady && !otherReady)  hint = t('race.hangar.markReady');
  else if (myReady && !otherReady)   hint = t('race.hangar.waitingRival');
  else if (!myReady && otherReady)   hint = t('race.hangar.rivalReady');
  else if (isDeploying)              hint = t('race.hangar.starting');

  return (
    <div className="online-hangar-ctrls">
      <div className="online-hangar-ctrls__hint online-hangar-ctrls__hint--top">{hint}</div>

      <div className="online-hangar-ctrls__row online-hangar-ctrls__row--no-hint">
        <button
          type="button"
          className="online-hangar-ctrls__btn online-hangar-ctrls__btn--ghost"
          onClick={onLeave}
          disabled={isDeploying}
        >{t('race.hangar.exit')}</button>

        <button
          type="button"
          className={
            `online-hangar-ctrls__btn online-hangar-ctrls__btn--primary` +
            (myReady ? ' online-hangar-ctrls__btn--active' : '')
          }
          onClick={onToggleReady}
          disabled={!canReady || isDeploying}
        >{myReady ? (<><Icon name="check" size={14} /> {t('race.hangar.readyOn')}</>) : t('race.hangar.ready')}</button>
      </div>

      <KeyHint
        className="online-hangar-ctrls__keys hangar-controls__hints"
        items={[
          { key: '←→',   label: t('keys.ship') },
          { key: 'WASD', label: t('keys.rotate') },
          { key: 'C',    label: t('keys.views') },
          { key: 'R',    label: t('keys.reset') },
          { key: 'K',    label: t('keys.fire') },
          { key: 'L',    label: t('keys.laser') },
          { key: 'J',    label: t('keys.boosters') },
          { key: 'X',    label: t('keys.detonate') },
          { key: '↵',    label: t('keys.ready') },
          { key: 'ESC',  label: t('keys.exit') },
        ]}
      />

      <div className={`online-sala-chip online-sala-chip--${connection}`}>
        <span className="online-sala-chip__label">{t('race.hangar.salaLabel')}</span>
        <span className="online-sala-chip__id">{roomCode ? `#${roomCode}` : t('race.room.public')}</span>
        <span className={`online-sala-chip__dot online-sala-chip__dot--${connection}`} />
        <span className="online-sala-chip__status">
          {connection === 'connected' ? t('race.hangar.connected') : connection === 'lost' ? t('race.hangar.lost') : t('race.hangar.connecting')}
        </span>
      </div>
    </div>
  );
}
