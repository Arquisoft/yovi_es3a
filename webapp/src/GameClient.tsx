import {useState, useRef} from 'react';

export default function GameClient() {
  const [connected, setConnected] = useState(false);
  const [yen, setYen] = useState<any>(null);
  const [renderText, setRenderText] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [cmd, setCmd] = useState<string>('');

  function stripAnsi(s: string) {
    return s.replace(/\x1b\[[0-9;]*m/g, '');
  }

  function connect() {
    if (wsRef.current) return;
    const ws = new WebSocket('ws://localhost:4000/ws');
    ws.onopen = () => { setConnected(true); console.log('WS open'); ws.send(JSON.stringify({type:'start', size:7, bot_id:'random'})); };
    ws.onmessage = (ev) => {
      try {
        const v = JSON.parse(ev.data);
        console.log('recv: ' + JSON.stringify(v));
        if (v.type === 'state' && v.yen) {
          setYen(v.yen);
          if (v.render && typeof v.render === 'string') setRenderText(stripAnsi(v.render));
        }
        if (v.type === 'render' && v.render && typeof v.render === 'string') setRenderText(stripAnsi(v.render));
      } catch(e) { console.log('bad json'); }
    };
    ws.onclose = () => { setConnected(false); console.log('WS closed'); wsRef.current = null; };
    ws.onerror = () => { console.log('WS error'); };
    wsRef.current = ws;
  }

  function makeMove() {
    if (!wsRef.current) return;
    if (!cmd) return;
    const msg = { type: 'command', line: cmd };
    wsRef.current.send(JSON.stringify(msg));
    console.log('sent command: ' + cmd);
    setCmd('');
  }

  return (
    <div style={{border:'1px solid #ddd', padding:12, marginTop:12}}>
      <h3>Game client (WS)</h3>
      <div>
        <button onClick={connect} disabled={connected}>Connect</button>
      </div>
      <div style={{marginTop:8}}>
        <strong>Render:</strong>
        <pre style={{whiteSpace:'pre-wrap', height: '420px', overflow:'auto', background:'#111', color:'#ddd', padding:8, fontFamily: 'monospace'}}>{renderText ?? (yen ? JSON.stringify(yen, null, 2) : '—')}</pre>
      </div>
      <div style={{marginTop:8}}>
        <input value={cmd} onChange={e => setCmd(e.target.value)} placeholder="Type CLI command (e.g. 5, help, resign)" style={{width: '60%'}} />
        <button onClick={makeMove} disabled={!connected || !cmd} style={{marginLeft:8}}>Send</button>
      </div>
    </div>
  );
}
