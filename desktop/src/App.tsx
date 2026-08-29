import { useEffect, useMemo, useState } from 'react';

type LocalMedia = { name: string; path: string; url: string; modifiedAt: string };
type SyncStatus = { state: 'idle'|'connecting'|'syncing'|'error'; connected?: boolean; downloaded: number; skipped: number; message?: string; downloadDir?: string; lastRunAt?: string };
type DesktopBridge = {
  connectGoogle(): Promise<SyncStatus>;
  syncNow(): Promise<SyncStatus>;
  getStatus(): Promise<SyncStatus>;
  listLocalMedia(): Promise<LocalMedia[]>;
  openDownloads(): Promise<void>;
  onDownloaded(cb:(event:{name:string;path:string})=>void):()=>void;
};

declare global { interface Window { photoSyncDesktop?: DesktopBridge } }

const nav=[['⌂','Tổng quan'],['▣','Ảnh'],['▤','Album'],['↗','Chia sẻ'],['⌖','Địa điểm'],['◉','Mọi người'],['□','Thư mục'],['◈','Tài khoản lưu trữ'],['⚙','Cài đặt']];

export function App(){
  const [active,setActive]=useState('Ảnh');
  const [query,setQuery]=useState('');
  const [media,setMedia]=useState<LocalMedia[]>([]);
  const [status,setStatus]=useState<SyncStatus>({state:'idle',downloaded:0,skipped:0,message:'Đang kiểm tra...'});
  const [selected,setSelected]=useState<LocalMedia|null>(null);

  async function refresh(){
    const bridge=window.photoSyncDesktop;
    if(!bridge)return;
    const [s,m]=await Promise.all([bridge.getStatus(),bridge.listLocalMedia()]);
    setStatus(s); setMedia(m);
  }

  useEffect(()=>{
    void refresh();
    const bridge=window.photoSyncDesktop;
    if(!bridge)return;
    const off=bridge.onDownloaded(()=>void refresh());
    const timer=setInterval(()=>void refresh(),10000);
    return()=>{off();clearInterval(timer)};
  },[]);

  const filtered=useMemo(()=>media.filter(x=>x.name.toLowerCase().includes(query.toLowerCase())),[media,query]);
  const busy=status.state==='syncing'||status.state==='connecting';

  async function connect(){
    const bridge=window.photoSyncDesktop; if(!bridge)return;
    setStatus(s=>({...s,state:'connecting',message:'Đang mở Google...'}));
    try{setStatus(await bridge.connectGoogle()); await refresh()}catch(e){setStatus(s=>({...s,state:'error',message:e instanceof Error?e.message:String(e)}))}
  }

  async function syncNow(){
    const bridge=window.photoSyncDesktop; if(!bridge)return;
    setStatus(s=>({...s,state:'syncing',message:'Đang đồng bộ...'}));
    setStatus(await bridge.syncNow()); await refresh();
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P</div><div><b>PhotoSync</b><small>Google Drive Photo Cloud</small></div></div>
      <nav>{nav.map(([icon,label])=><button key={label} className={active===label?'nav-item active':'nav-item'} onClick={()=>setActive(label)}><span>{icon}</span>{label}</button>)}</nav>
      <div className="sidebar-status"><span className={`status-dot ${status.state==='error'?'error':''}`}/><div><b>{busy?'Đang đồng bộ':status.connected?'Đã kết nối':'Chưa kết nối'}</b><small>{status.message||'Google Drive'}</small></div></div>
    </aside>

    <main className="workspace">
      <header className="topbar"><div><h1>{active}</h1><p>{media.length} ảnh/video trên máy • nguồn Google Drive</p></div><div className="top-actions"><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo tên file..."/><kbd>⌘ K</kbd></div><button className="avatar">PS</button></div></header>
      <section className="toolbar"><div className="tabs"><button className="selected">Tất cả</button><button>Năm</button><button>Tháng</button><button>Ngày</button><button onClick={()=>window.photoSyncDesktop?.openDownloads()}>Mở thư mục</button></div><div className="view-actions"><button onClick={()=>void syncNow()} disabled={busy}>↻</button><button>▦</button></div></section>

      <section className="content-area">
        <div className="gallery-pane">
          <div className="date-heading"><div><h3>Thư viện PhotoSync</h3><span>{filtered.length} mục</span></div><button>Chọn</button></div>
          {filtered.length===0?<div className="empty-state"><div className="empty-cloud">☁</div><h2>{status.connected?'Chưa có ảnh được tải về':'Kết nối Google Drive để bắt đầu'}</h2><p>{status.connected?'Bấm Đồng bộ ngay hoặc backup ảnh từ mobile.':'Sau khi kết nối, app tự kiểm tra ảnh mới mỗi 30 giây.'}</p><button className="sync-now" onClick={()=>status.connected?void syncNow():void connect()}>{status.connected?'Đồng bộ ngay':'Kết nối Google Drive'}</button></div>:
          <div className="photo-grid">{filtered.map(item=><button className="photo-card" key={item.path} onClick={()=>setSelected(item)}><img src={item.url} alt={item.name}/><span className="photo-name">{item.name}</span></button>)}</div>}
        </div>

        <aside className="right-rail">
          <div className="panel storage-panel"><div className="panel-head"><div><h3>Google Drive</h3><p>Kho lưu trữ PhotoSync</p></div><span className={status.connected?'live-dot':'status-dot'}/></div><div className="drive-account"><div className="google">G</div><div><b>{status.connected?'Đã đăng nhập':'Chưa đăng nhập'}</b><small>{status.downloadDir||'Pictures/PhotoSync'}</small></div></div><button className="add-account" onClick={()=>void connect()}>＋ {status.connected?'Đổi tài khoản Google':'Kết nối Google Drive'}</button></div>
          <div className="panel backup-panel"><div className="panel-head"><div><h3>Đồng bộ về máy</h3><p>Tự động mỗi 30 giây</p></div><label className="switch"><input type="checkbox" checked={status.connected} readOnly/><span/></label></div><div className="sync-stat"><span>Trạng thái</span><b>{busy?'Đang chạy':status.state==='error'?'Có lỗi':'Sẵn sàng'}</b></div><div className="sync-stat"><span>Lần gần nhất</span><b>{status.lastRunAt?new Date(status.lastRunAt).toLocaleTimeString():'—'}</b></div><button className="sync-now" onClick={()=>void syncNow()} disabled={!status.connected||busy}>{busy?'Đang đồng bộ...':'Đồng bộ ngay'}</button></div>
          <div className="panel activity-panel"><div className="panel-head"><div><h3>Hoạt động</h3><p>Drive → Laptop</p></div><span className="live-dot"/></div><div className="activity-summary"><b>{status.downloaded}</b><span>file mới tải ở lần gần nhất</span></div><div className="activity-summary"><b>{status.skipped}</b><span>file đã có trên máy</span></div><button className="backup-option" onClick={()=>window.photoSyncDesktop?.openDownloads()}><div><b>Mở Pictures/PhotoSync</b><small>Xem file gốc trên máy</small></div><span>›</span></button></div>
        </aside>
      </section>
    </main>

    {selected&&<div className="viewer" onClick={()=>setSelected(null)}><div className="viewer-top"><button>‹</button><div><b>{selected.name}</b><small>{new Date(selected.modifiedAt).toLocaleString()}</small></div><span/><button>⋯</button></div><img src={selected.url} alt={selected.name}/><div className="viewer-actions"><button>♡<small>Yêu thích</small></button><button onClick={e=>{e.stopPropagation();window.photoSyncDesktop?.openDownloads()}}>□<small>Mở thư mục</small></button></div></div>}
  </div>
}
