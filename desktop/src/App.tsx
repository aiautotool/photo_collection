import {useEffect,useMemo,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';

type Account={id:string,email:string,app_used_bytes:number,provider_free_bytes:number,safe_available_bytes:number,status:string};

type NavItem={label:string,icon:string};

const nav:NavItem[]=[
  {label:'Tổng quan',icon:'⌂'},
  {label:'Ảnh',icon:'▣'},
  {label:'Thư viện',icon:'◫'},
  {label:'Album',icon:'▤'},
  {label:'Chia sẻ',icon:'↗'},
  {label:'Địa điểm',icon:'⌖'},
  {label:'Mọi người',icon:'◉'},
  {label:'Thư mục',icon:'□'},
  {label:'Tài khoản lưu trữ',icon:'◈'},
  {label:'Cài đặt',icon:'⚙'},
];

const photos=[
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=900',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900',
  'https://images.unsplash.com/photo-1511497584788-876760111969?w=900',
  'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=900',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=900',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900',
];

const mockAccounts:Account[]=[
  {id:'1',email:'khanh@gmail.com',app_used_bytes:8.2*1073741824,provider_free_bytes:6.8*1073741824,safe_available_bytes:1.8*1073741824,status:'READY'},
  {id:'2',email:'khanh.work@gmail.com',app_used_bytes:4.1*1073741824,provider_free_bytes:10.9*1073741824,safe_available_bytes:5.9*1073741824,status:'READY'},
  {id:'3',email:'backup.family@gmail.com',app_used_bytes:2.7*1073741824,provider_free_bytes:12.3*1073741824,safe_available_bytes:7.3*1073741824,status:'READY'},
];

export function App(){
  const[accounts,setAccounts]=useState<Account[]>(mockAccounts);
  const[active,setActive]=useState('Ảnh');
  const[query,setQuery]=useState('');
  const[selected,setSelected]=useState<string|null>(null);
  const[showStorage,setShowStorage]=useState(true);
  const[showBackup,setShowBackup]=useState(false);

  useEffect(()=>{
    invoke<Account[]>('demo_accounts').then(data=>data.length&&setAccounts(data)).catch(()=>{});
  },[]);

  const totalUsed=useMemo(()=>accounts.reduce((sum,a)=>sum+a.app_used_bytes,0)/1073741824,[accounts]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P</div><div><b>PhotoSync</b><small>Drive Photo Cloud</small></div></div>
      <nav>{nav.map(item=><button key={item.label} className={active===item.label?'nav-item active':'nav-item'} onClick={()=>{setActive(item.label); if(item.label==='Tài khoản lưu trữ')setShowStorage(true)}}><span>{item.icon}</span>{item.label}</button>)}</nav>
      <div className="sidebar-status"><span className="status-dot"/><div><b>Đồng bộ đang chạy</b><small>3 tài khoản Google Drive</small></div></div>
    </aside>

    <main className="workspace">
      <header className="topbar">
        <div><h1>{active}</h1><p>Quản lý và sao lưu ảnh trên mọi thiết bị</p></div>
        <div className="top-actions">
          <div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm ảnh, người, địa điểm..."/><kbd>⌘ K</kbd></div>
          <button className="icon-btn">?</button><button className="avatar">KT</button>
        </div>
      </header>

      <section className="toolbar">
        <div className="tabs"><button className="selected">Tất cả</button><button>Năm</button><button>Tháng</button><button>Ngày</button><button>Thư mục</button></div>
        <div className="view-actions"><button>⌕</button><button>▦</button><button>⋯</button></div>
      </section>

      <section className="content-area">
        <div className="gallery-pane">
          <div className="date-heading"><div><h3>Tháng 5 2024</h3><span>18 mục</span></div><button>Chọn</button></div>
          <div className="photo-grid">
            {photos.map((src,i)=><button className="photo-card" key={`${src}-${i}`} onClick={()=>setSelected(src)}>
              <img src={src} alt={`Photo ${i+1}`}/>
              <span className="photo-check">✓</span>
            </button>)}
          </div>
          <div className="date-heading second"><div><h3>Tháng 4 2024</h3><span>12 mục</span></div></div>
        </div>

        <aside className="right-rail">
          <div className="panel storage-panel">
            <div className="panel-head"><div><h3>Tài khoản lưu trữ</h3><p>Google Drive pool</p></div><button onClick={()=>setShowStorage(!showStorage)}>⌃</button></div>
            {showStorage&&<>
              <div className="account-list">{accounts.map((a,i)=>{
                const used=a.app_used_bytes/1073741824;
                return <div className="account" key={a.id}>
                  <div className="google">G</div>
                  <div className="account-info"><div><b>{a.email}</b><span>{used.toFixed(1)} / 10 GB</span></div><div className="progress"><i style={{width:`${Math.min(used/10*100,100)}%`}}/></div><small>{a.status==='READY'?'Sẵn sàng sao lưu':'Đã đạt giới hạn'}</small></div>
                </div>
              })}</div>
              <button className="add-account">＋ Thêm tài khoản Google</button>
              <div className="storage-summary"><div><span>Tổng dung lượng đã dùng</span><b>{totalUsed.toFixed(1)} GB <small>/ {accounts.length*10} GB</small></b></div><div className="multi-progress"><i style={{width:`${Math.min(totalUsed/(accounts.length*10)*100,100)}%`}}/></div><small>Mỗi tài khoản luôn chừa tối thiểu 5 GB</small></div>
            </>}
          </div>

          <div className="panel backup-panel">
            <div className="panel-head"><div><h3>Sao lưu</h3><p>Tự động & an toàn</p></div><label className="switch"><input type="checkbox" defaultChecked/><span/></label></div>
            <button className="backup-option" onClick={()=>setShowBackup(!showBackup)}><div><b>Ảnh & Video</b><small>Chất lượng gốc</small></div><span>›</span></button>
            {showBackup&&<div className="backup-detail"><label><input type="checkbox" defaultChecked/> Ảnh</label><label><input type="checkbox" defaultChecked/> Video</label><label><input type="checkbox" defaultChecked/> Live Photos</label></div>}
            <label className="check-row"><input type="checkbox" defaultChecked/> Chỉ dùng Wi‑Fi</label>
            <label className="check-row"><input type="checkbox" defaultChecked/> Chạy khi khởi động máy</label>
          </div>

          <div className="panel activity-panel">
            <div className="panel-head"><div><h3>Hoạt động gần đây</h3><p>Đồng bộ trực tiếp</p></div><span className="live-dot"/></div>
            {[0,1,2].map(i=><div className="activity" key={i}><img src={photos[i]} alt="thumb"/><div><b>IMG_20240512_{String(i+1).padStart(4,'0')}.jpg</b><small>Đã tải lên • {i+2} phút trước</small></div><span>✓</span></div>)}
            <button className="sync-now" onClick={()=>invoke('run_sync_cycle').catch(()=>{})}>Chạy đồng bộ ngay</button>
          </div>
        </aside>
      </section>
    </main>

    {selected&&<div className="viewer" onClick={()=>setSelected(null)}><div className="viewer-top"><button>‹</button><div><b>Đà Lạt, Việt Nam</b><small>12 tháng 5, 2024 • 06:45</small></div><span/><button>⋯</button></div><img src={selected} alt="Selected"/><div className="viewer-actions"><button>↗<small>Chia sẻ</small></button><button>♡<small>Yêu thích</small></button><button>◒<small>Chỉnh sửa</small></button><button>⌫<small>Xóa</small></button></div></div>}
  </div>
}
