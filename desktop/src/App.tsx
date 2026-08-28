import {useEffect,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';

type Account={id:string,email:string,app_used_bytes:number,provider_free_bytes:number,safe_available_bytes:number,status:string};

export function App(){
  const[accounts,setAccounts]=useState<Account[]>([]);
  useEffect(()=>{invoke<Account[]>('demo_accounts').then(setAccounts).catch(()=>setAccounts([]))},[]);
  return <div className="shell">
    <aside><h2>PhotoSync</h2><nav>Library<br/>Devices<br/>Sync<br/><b>Storage</b><br/>Settings</nav></aside>
    <main><h1>Storage pool</h1><p>Every Google account: max 10 GiB PhotoSync usage, keep 5 GiB free.</p>
      <section>{accounts.map(a=><article key={a.id}><strong>{a.email}</strong><span>{a.status}</span><div>{(a.safe_available_bytes/1073741824).toFixed(2)} GiB safe capacity</div></article>)}</section>
      <button onClick={()=>invoke('run_sync_cycle')}>Run sync cycle</button>
    </main>
  </div>
}
