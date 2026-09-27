import { useEffect } from 'react';
import { App } from './App';
import { navigate, usePath } from './router';
import { Docs } from './screens/Docs';
import { Landing } from './screens/Landing';

export function Root() {
  const path = usePath();
  const room = new URLSearchParams(location.search).get('room');

  // Invite links made before the game moved to /main were "/?room=MY-1234".
  useEffect(() => {
    if (path === '/' && room) navigate(`/main?room=${encodeURIComponent(room)}`);
  }, [path, room]);

  useEffect(() => {
    document.title = path.startsWith('/docs') ? 'BALANG · Dokumentasi' : path.startsWith('/main') ? 'BALANG · Main' : 'BALANG · Agak. Risiko. Menang.';
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [path]);

  if (path.startsWith('/main')) return <App />;
  if (path.startsWith('/docs')) return <Docs />;
  return <Landing />;
}
