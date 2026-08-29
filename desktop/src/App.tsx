import { useEffect, useMemo, useState } from 'react';

type LocalMedia = { name:string; path:string; url:string; modifiedAt:string; sourceDevice?:string };
type DesktopStatus = { state:'idle'|'receiving'|'uploading'|'error'; received:number; duplicates:number; cloudUploaded:number; cloudBlocked:number; message?:string; receiverUrl?:string; pairCode?:string; libraryPath?:string; driveAccounts?:number; lastRunAt?:string };
type DesktopBridge = {
  getStatus():Promise<DesktopStatus>;
  listLocalMedia():Promise<LocalMedia[]>;
  openLibrary():Promise<void>;
  addGoogleAccount():Promise<DesktopStatus>;
  retryCloud():Promise<DesktopStatus>;
  onFileReceived(cb:(event:{name:string;path:string})=>void):()=>void;
  onStorageUpdated(cb:(event:unknown)=>void):()=>void;
};
declare global { interface Window { photoSyncDesktop?:DesktopBridge } }

const nav=[['⌂','Tổng quan'],['▣','Ảnh'],['▤','Album'],['◫','Thiết bị'],['◈','Tài khoản lưu trữ'],['⚙','Cài đặt']];

export function App(){
  const [active,setActive]=useState('Ảnh');
  const [query,setQuery]=useState('');
  const [media,setMedia]=useState<LocalMedia[]>([]);
  const [selected,setSelected]=useState<LocalMedia|null>(null);
  const [status,setStatus]=useState<DesktopStatus>({state:'idle',received:0,duplicates:0,cloudUploaded:0,cloudBlocked:0});

  async function refresh(){const b=window.photoSyncDesktop;if(!b)return;const [s,m]=await Promise.all([b.getStatus(),b.listLocalMedia()]);setStatus(s);setMedia(m)}
  useEffect(()=>{void refresh();const b=window.photoSyncDesktop;if(!b)return;const off1=b.onFileReceived(()=>void refresh());const off2=b.onStorageUpdated(()=>void refresh());const t=setInterval(()=>void refresh(),8000);return()=>{off1();off2();clearInterval(t)}},[]);
  const filtered=useMemo(()=>media.filter(x=>x.name.toLowerCase().includes(query.toLowerCase())),[media,query]);

  async function addGoogle(){const b=window.photoSyncDesktop;if(!b)return;try{setStatus(await b.addGoogleAccount());await refresh()}catch(e){setStatus(s=>({...s,state:'error',message:e instanceof Error?e.message:String(e)}))}}
  async function retryCloud(){const b=window.photoSyncDesktop;if(!b)return;setStatus(await b.retryCloud());await refresh()}

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P</div><div><b>PhotoSync</b><small>Laptop Photo Hub</small></div></div>
      <nav>{nav.map(([icon,label])=><button key={label} className={active===label?'nav-item active':'nav-item'} onClick={()=>setActive(label)}><span>{icon}</span>{label}</button>)}</nav>
      <div className="sidebar-status"><span className="status-dot"/><div><b>Receiver đang chạy</b><small>{status.receiverUrl||'Đang khởi tạo LAN...'}</small></div></div>
    </aside>

    <main className="workspace">
      <header className="topbar"><div><h1>{active}</h1><p>Mobile → Laptop → Local / Google Drive</p></div><div className="top-actions"><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm ảnh, video..."/><kbd>⌘ K</kbd></div><button className="avatar">PS</button></div></header>
      <section className="toolbar"><div className="tabs"><button className="selected">Tất cả</button><button>Năm</button><button>Tháng</button><button>Ngày</button><button onClick={()=>window.photoSyncDesktop?.openLibrary()}>Mở thư mục</button></div><div className="view-actions"><button onClick={()=>void refresh()}>↻</button><button>▦</button></div></section>

      <section className="content-area">
        <div className="gallery-pane">
          <div className="date-heading"><div><h3>Thư viện PhotoSync</h3><span>{filtered.length} mục đã nhận từ mobile</span></div><button>Chọn</button></div>
          {filtered.length===0?<div className="empty-state"><div className="empty-cloud">▰</div><h2>Chưa nhận ảnh từ điện thoại</h2><p>Mở PhotoSync trên mobile, nhập địa chỉ và mã ghép nối hiển thị bên phải.</p></div>:<div className="photo-grid">{filtered.map(item=><button className="photo-card" key={item.path} onClick={()=>setSelected(item)}><img src={item.url} alt={item.name}/><span className="photo-name">{item.name}</span></button>)}</div>}
        </div>

        <aside className="right-rail">
          <div className="panel storage-panel">
            <div className="panel-head"><div><h3>Kết nối điện thoại</h3><p>PhotoSync Receiver</p></div><span className="live-dot"/></div>
            <div className="drive-account"><div className="google">↔</div><div><b>{status.receiverUrl||'Đang khởi tạo...'}</b><small>Port 43117 • LAN trực tiếp</small></div></div>
            <div className="storage-summary"><div><span>Mã ghép nối</span><b style={{fontSize:26,letterSpacing:4}}>{status.pairCode||'------'}</b></div><small>Nhập mã này trên mobile. Không cần Google trên điện thoại.</small></div>
          </div>

          <div className="panel backup-panel">
            <div className="panel-head"><div><h3>Local Storage</h3><p>Bản gốc trên laptop</p></div><span className="live-dot"/></div>
            <div className="sync-stat"><span>Thư viện</span><b>{media.length} file</b></div>
            <div className="sync-stat"><span>Đã nhận</span><b>{status.received}</b></div>
            <div className="sync-stat"><span>Trùng đã bỏ qua</span><b>{status.duplicates}</b></div>
            <button className="sync-now" onClick={()=>window.photoSyncDesktop?.openLibrary()}>Mở Pictures/PhotoSync</button>
          </div>

          <div className="panel storage-panel">
            <div className="panel-head"><div><h3>Google Drive Pool</h3><p>Storage Manager phía laptop</p></div><span className={status.driveAccounts?'live-dot':'status-dot'}/></div>
            <div className="storage-summary"><div><span>Tài khoản đã thêm</span><b>{status.driveAccounts||0}</b></div><div><span>Đã upload cloud</span><b>{status.cloudUploaded}</b></div><div><span>Bị chặn bởi quota</span><b>{status.cloudBlocked}</b></div><small>Mỗi Drive tối đa 10 GB cho PhotoSync và luôn chừa ít nhất 5 GB.</small></div>
            <button className="add-account" onClick={()=>void addGoogle()}>＋ Thêm tài khoản Google</button>
            <button className="sync-now" onClick={()=>void retryCloud()}>Phân phối file đang chờ</button>
          </div>

          <div className="panel activity-panel"><div className="panel-head"><div><h3>Luồng lưu trữ</h3><p>Laptop là trung tâm</p></div><span className="live-dot"/></div><div className="activity-summary"><b>1</b><span>Mobile gửi file vào Receiver</span></div><div className="activity-summary"><b>2</b><span>Lưu bản gốc xuống local</span></div><div className="activity-summary"><b>3</b><span>Storage Manager chọn Drive đủ chỗ</span></div></div>
        </aside>
      </section>
    </main>

    {selected&&<div className="viewer" onClick={()=>setSelected(null)}><div className="viewer-top"><button>‹</button><div><b>{selected.name}</b><small>{selected.sourceDevice||'mobile'} • {new Date(selected.modifiedAt).toLocaleString()}</small></div><span/><button>⋯</button></div><img src={selected.url} alt={selected.name}/><div className="viewer-actions"><button onClick={e=>{e.stopPropagation();window.photoSyncDesktop?.openLibrary()}}>□<small>Mở thư mục</small></button></div></div>}
  </div>
}
