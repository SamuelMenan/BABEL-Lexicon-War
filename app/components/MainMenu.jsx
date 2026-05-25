import React, { useEffect, useState } from 'react';
import { Bridge } from '../../shared/bridge.js';
import { GAME_MODES } from '../../shared/constants.js';
import Settings from './Settings.jsx';
import KeyboardNavigable from './common/KeyboardNavigable.jsx';
import AuthModal from './auth/AuthModal.jsx';
import LeaderboardModal from './leaderboard/LeaderboardModal.jsx';
import GuestPromptModal from './auth/GuestPromptModal.jsx';
import KeyHint from './common/KeyHint.jsx';
import Icon from './common/Icon.jsx';
import CreditsModal from './credits/CreditsModal.jsx';
import RaceModeSelectModal from './race/RaceModeSelectModal.jsx';
import LobbyBrowser from './race/online/LobbyBrowser.jsx';
import RoomScreen from './race/online/RoomScreen.jsx';
import OnlineRoomHangar from './race/online/OnlineRoomHangar.jsx';
import { createOnlineRaceSync } from '../../game/services/supabase/onlineRaceSync.js';
import { recordOnlineMatch } from '../../game/services/supabase/rooms.js';
import { EventBus } from '../../shared/events.js';
import {
  attachRematchSync, detachRematchSync, clearPendingRoom,
} from '../../game/services/online/rematchCoordinator.js';
import { getSession, onAuthChange, signOut, isAuthAvailable, resolveDisplayName, applyAuthenticatedProfile } from '../../game/services/supabase/auth.js';
import { loadProfile } from '../../shared/playerProfile.js';
import { getCharacter } from '../../shared/characterData.js';
import useTranslation from '../../shared/i18n/useTranslation.js';
import { playBgm } from '../../shared/audioManager.js';

export default function MainMenu() {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('visuals');
  const [authUser, setAuthUser] = useState(null);
  const [authModal, setAuthModal] = useState(null); // 'signin' | 'signup' | null
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCredits,     setShowCredits]     = useState(false);
  const [guestPrompt, setGuestPrompt] = useState(null); // { feature, onProceed } | null
  const [raceModePick, setRaceModePick] = useState(false);
  const [onlineLobby,   setOnlineLobby] = useState(() => {
    // Si MatchResult guardo intent de revancha, reabrir lobby al volver.
    try {
      if (window.sessionStorage?.getItem('online:reopen-lobby') === '1') {
        window.sessionStorage.removeItem('online:reopen-lobby');
        return true;
      }
    } catch { /* ignore */ }
    return false;
  });
  const [onlineRoom,    setOnlineRoom]  = useState(null); // { roomId, role, phase: 'lobby' | 'hangar' } | null

  // Auto-open RoomScreen si Bridge tiene onlinePendingRoom (revancha aceptada
  // o propuesta enviada mientras MatchResult estaba visible).
  // Tambien cierra RoomScreen si Bridge.onlineRoom se limpia (rival rechazo
  // revancha → coordinator pone onlinePendingRoom=null + onlineRoom=null).
  useEffect(() => {
    // Rematch nuevas salas siempre arrancan en phase='lobby' — RoomScreen
    // detecta ambos jugadores y transiciona a 'hangar' automaticamente.
    const withPhase = (r) => r ? { ...r, phase: 'lobby' } : null;
    const pending = Bridge.peekState().onlinePendingRoom;
    if (pending) {
      setOnlineRoom(withPhase(pending));
      setOnlineLobby(true);
      clearPendingRoom();
    }
    return Bridge.onStateChange((s) => {
      if (s.onlinePendingRoom && !onlineRoom) {
        setOnlineRoom(withPhase(s.onlinePendingRoom));
        setOnlineLobby(true);
        clearPendingRoom();
      }
      // Coordinator pidio cerrar la sala (rival rechazo revancha, etc.).
      if (s.onlineRoom === null && onlineRoom && s.onlineNotice) {
        setOnlineRoom(null);
      }
    });
  }, [onlineRoom]);

  useEffect(() => { playBgm('bgm.main_menu'); }, []);

  // Leaderboard panel: usa bgm.leaderboard mientras esta abierto, restaura
  // bgm.main_menu al cerrarlo. Modal de creditos maneja su propio prev/restore.
  useEffect(() => {
    if (showLeaderboard) playBgm('bgm.leaderboard');
    else playBgm('bgm.main_menu');
  }, [showLeaderboard]);

  useEffect(() => {
    let mounted = true;
    getSession().then((s) => {
      if (!mounted) return;
      setAuthUser(s?.user || null);
      if (s?.user) applyAuthenticatedProfile({ user: s.user });
    });
    const off = onAuthChange((user) => {
      if (!mounted) return;
      setAuthUser(user);
      if (user) applyAuthenticatedProfile({ user });
    });
    return () => { mounted = false; off(); };
  }, []);

  if (showSettings) return <Settings onClose={() => setShowSettings(false)} initialTab={settingsTab} />;

  const displayName = authUser
    ? resolveDisplayName({
        user: authUser,
        profile: loadProfile(),
        characterName: getCharacter(loadProfile().selectedCharacter)?.name,
      })
    : null;

  // Defer scope-changing commands un tick para que el Enter actual termine
  // antes de cambiar a scope 'hangar'. Sin esto, el mismo Enter dispara
  // KbNav activate (menu) + KeybindService CONFIRM (hangar) en cascada.
  const deferred = (fn) => () => setTimeout(fn, 0);

  // Si invitado: muestra modal y al "Seguir como invitado" o login exitoso, ejecuta accion.
  const gatedByGuest = (feature, action) => () => {
    if (!authUser) {
      setGuestPrompt({ feature, onProceed: action });
      return;
    }
    action();
  };

  const items = [
    {
      id: 'combat',
      label: t('mainMenu.combat.label'),
      desc: t('mainMenu.combat.desc'),
      glyph: 'swords',
      accent: 'var(--col-danger)',
      action: gatedByGuest('combat', deferred(() => Bridge.commands.openShipSelection(GAME_MODES.COMBAT))),
    },
    {
      id: 'racing',
      label: t('mainMenu.racing.label'),
      desc: t('mainMenu.racing.desc'),
      glyph: 'rocket_launch',
      accent: 'var(--col-primary)',
      action: gatedByGuest('racing', deferred(() => setRaceModePick(true))),
    },
    {
      id: 'settings',
      label: t('mainMenu.settings.label'),
      desc: t('mainMenu.settings.desc'),
      glyph: 'settings',
      accent: 'var(--text-dim)',
      action: () => { setSettingsTab('visuals'); setShowSettings(true); },
    },
    {
      id: 'ranking',
      label: t('mainMenu.ranking.label'),
      desc: t('mainMenu.ranking.desc'),
      glyph: 'leaderboard',
      accent: 'var(--col-primary)',
      action: gatedByGuest('leaderboard', () => setShowLeaderboard(true)),
    },
    {
      id: 'credits',
      label: t('mainMenu.credits.label'),
      desc: t('mainMenu.credits.desc'),
      glyph: 'group',
      accent: 'var(--text-dim)',
      action: () => setShowCredits(true),
    },
  ];

  return (
    <div className="main-menu">
      {/* Background system unificado */}
      <div className="babel-bg" aria-hidden="true">
        <div className="babel-bg__orb babel-bg__orb--primary" />
        <div className="babel-bg__orb babel-bg__orb--danger" />
        <div className="babel-bg__grid" />
        <div className="babel-bg__scanlines" />
      </div>

      {/* Header */}
      <header className="babel-frame__header">
        <span>{t('mainMenu.header')}</span>
      </header>

      {/* Auth pill — siempre visible; modal avisa si Supabase no esta configurado */}
      <div className="auth-pill">
        {authUser ? (
          <>
            <span className="auth-pill__user">
              <span className="auth-pill__user-tag">{t('mainMenu.userTag')}</span>{displayName}
            </span>
            <button
              type="button"
              className="auth-pill__btn auth-pill__btn--ghost"
              onClick={async () => { await signOut(); setAuthUser(null); }}
            >{t('mainMenu.signOut')}</button>
          </>
        ) : (
          <>
            <button type="button" className="auth-pill__btn" onClick={() => setAuthModal('signin')}>
              {t('mainMenu.signIn')}
            </button>
            <button type="button" className="auth-pill__btn auth-pill__btn--ghost" onClick={() => setAuthModal('signup')}>
              {t('mainMenu.signUp')}
            </button>
          </>
        )}
        {!isAuthAvailable() && (
          <span className="auth-pill__user-tag" title="Falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY">
            <Icon name="warning" size={12} /> {t('mainMenu.offline')}
          </span>
        )}
      </div>

      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={(user) => setAuthUser(user)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}

      {showCredits && (
        <CreditsModal onClose={() => setShowCredits(false)} />
      )}

      {raceModePick && (
        <RaceModeSelectModal
          onClose={() => setRaceModePick(false)}
          onSelectSingle={() => {
            setRaceModePick(false);
            Bridge.commands.openShipSelection(GAME_MODES.RACING);
          }}
          onSelectOnline={() => {
            setRaceModePick(false);
            setOnlineLobby(true);
          }}
        />
      )}

      {onlineLobby && !onlineRoom && (
        <LobbyBrowser
          onClose={() => setOnlineLobby(false)}
          onEnterRoom={(roomId, role) => {
            setOnlineRoom({ roomId, role, phase: 'lobby' });
          }}
        />
      )}

      {/* Phase 'lobby' = RoomScreen (matchmaking, espera rival).
          Phase 'hangar' = OnlineRoomHangar (3D, ship pick, ready, deploy).
          Auto-transicion: RoomScreen detecta ambos en sala → onRivalFound → phase='hangar'. */}
      {onlineRoom && onlineRoom.phase === 'lobby' && (
        <RoomScreen
          roomId={onlineRoom.roomId}
          role={onlineRoom.role}
          onLeave={() => { setOnlineRoom(null); }}
          onRivalFound={() => {
            setOnlineRoom((prev) => prev ? { ...prev, phase: 'hangar' } : null);
          }}
        />
      )}

      {onlineRoom && onlineRoom.phase === 'hangar' && (
        <OnlineRoomHangar
          roomId={onlineRoom.roomId}
          role={onlineRoom.role}
          onLeave={() => { setOnlineRoom(null); }}
          onMatchStart={(room) => {
            const role = onlineRoom.role;
            const profile = loadProfile();
            const myShip   = role === 'host' ? room.host_ship  : room.guest_ship;
            const oppShip  = role === 'host' ? room.guest_ship : room.host_ship;
            const myPilot  = role === 'host' ? room.host_pilot : room.guest_pilot;
            const oppPilot = role === 'host' ? room.guest_pilot : room.host_pilot;

            // Inicia capa de sincronizacion realtime (canal broadcast).
            const sync = createOnlineRaceSync(room.id);

            // Espera resultado del rival, decide ganador (solo host registra DB).
            let remoteFinish = null;
            let localFinish  = null;
            let disconnected = false;
            const tryRecord = async () => {
              // Caso normal: ambos finish llegaron.
              // Caso disconnect: rival caido, asumir avgWpm=0 → ganador = local.
              if (!localFinish) return;
              if (role !== 'host') return;
              const haveRemote = !!remoteFinish || disconnected;
              if (!haveRemote) return;
              const hostAvg  = localFinish.avgWpm;
              const guestAvg = remoteFinish?.avgWpm ?? 0;
              const hostAcc  = localFinish.accuracy;
              const guestAcc = remoteFinish?.accuracy ?? 0;
              let winnerId = null;
              if (hostAvg > guestAvg) winnerId = room.host_id;
              else if (guestAvg > hostAvg) winnerId = room.guest_id;
              else if (hostAcc > guestAcc) winnerId = room.host_id;
              else if (guestAcc > hostAcc) winnerId = room.guest_id;
              try {
                await recordOnlineMatch({
                  roomId: room.id, hostAvgWpm: hostAvg, guestAvgWpm: guestAvg,
                  hostAccuracy: hostAcc, guestAccuracy: guestAcc, winnerPlayerId: winnerId,
                });
              } catch (e) { console.warn('[online] record falla', e); }
            };
            sync.onRemoteFinish((s) => { remoteFinish = s; tryRecord(); });
            sync.onDisconnect(() => {
              disconnected = true;
              // Si guest no termino antes del timeout, marcarlo perdido por abandono.
              if (!remoteFinish) {
                remoteFinish = { avgWpm: 0, accuracy: 0 };
                Bridge.setState({ onlineOpponentStats: { ...remoteFinish, distance: 0, phrasesDone: 0 } });
              }
              tryRecord();
            });
            const offLocalFinish = EventBus.on('online:race_finish_local', (s) => {
              localFinish = s;
              tryRecord();
            });

            // Rematch via coordinator singleton — sobrevive unmount de MainMenu.
            // Listeners + estado (pendingInvite/pendingRoom) en Bridge global.
            attachRematchSync({ sync, room, role, profile, myPilot });

            // Limpieza tardia — 60s para permitir coordinacion de revancha.
            const offGameOver = EventBus.on('game:over', () => {
              setTimeout(() => {
                sync.dispose();
                detachRematchSync(sync);
                offLocalFinish();
                offGameOver();
              }, 60000);
            });

            // Cierra RoomScreen + arranca carrera online.
            setOnlineRoom(null);
            setOnlineLobby(false);
            Bridge.commands.startOnlineRace({
              room, role,
              ship: myShip, opponentShip: oppShip,
              pilot: myPilot, opponentPilot: oppPilot,
            });
          }}
        />
      )}

      {guestPrompt && (
        <GuestPromptModal
          feature={guestPrompt.feature}
          onClose={() => {
            const proceed = guestPrompt.onProceed;
            setGuestPrompt(null);
            // Cierra sin login → ejecuta accion igual (invitado puede jugar).
            proceed?.();
          }}
          onAuthSuccess={(user) => {
            setAuthUser(user);
            const proceed = guestPrompt.onProceed;
            setGuestPrompt(null);
            proceed?.();
          }}
        />
      )}

      {/* Main */}
      <main className="main-menu__main">
        <div className="main-menu__title-block">
          <div className="babel-divider" />
          <h1 className="main-menu__title" data-text="BABEL">BABEL:</h1>
          <p className="main-menu__subtitle" data-text="BABEL: Lexicon War">{t('mainMenu.subtitle')}</p>
          <div className="babel-divider" />

        </div>

        <KeyboardNavigable
          items={items}
          orientation="vertical"
          onActivate={(it) => it.action()}
          initialIndex={0}
        >
          {(it, { focused, activate }) => (
            <button
              key={it.id}
              className={`main-menu__btn${focused ? ' main-menu__btn--focused' : ''}`}
              style={{ '--btn-accent': it.accent }}
              onClick={activate}
              onMouseEnter={(e) => e.currentTarget.focus()}
            >
              <span className="main-menu__btn-icon" aria-hidden="true"><Icon name={it.glyph} size={22} /></span>
              <span className="main-menu__btn-body">
                <span className="main-menu__btn-label">{it.label}</span>
                <span className="main-menu__btn-desc">{it.desc}</span>
              </span>
              <span className="main-menu__btn-arrow" aria-hidden="true">→</span>
            </button>
          )}
        </KeyboardNavigable>

        <KeyHint
          className="main-menu__hint"
          items={[
            { key: '↑↓',    label: t('keys.navigate') },
            { key: 'Enter', label: t('keys.select') },
            { key: '1-5',   label: t('keys.shortcut') },
            { key: '?',     label: t('keys.shortcuts') },
          ]}
        />
      </main>

      {/* Footer */}
      <footer className="babel-frame__footer">
        {t('mainMenu.footer')}
      </footer>
    </div>
  );
}
