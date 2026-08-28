use serde::Serialize;

pub const GIB:u64=1024*1024*1024;
pub const APP_CAP:u64=10*GIB;
pub const RESERVE:u64=5*GIB;

#[derive(Clone,Debug,Serialize)]
pub struct StorageAccount{
    pub id:String,
    pub email:String,
    pub app_used_bytes:u64,
    pub provider_free_bytes:u64,
    pub safe_available_bytes:u64,
    pub status:String,
}

impl StorageAccount{
    pub fn new(id:&str,email:&str,app:u64,free:u64)->Self{
        let mut a=Self{id:id.into(),email:email.into(),app_used_bytes:app,provider_free_bytes:free,safe_available_bytes:0,status:String::new()};
        a.safe_available_bytes=safe_available(&a);
        a.status=status(&a);
        a
    }
}

pub fn safe_available(a:&StorageAccount)->u64{
    (APP_CAP.saturating_sub(a.app_used_bytes)).min(a.provider_free_bytes.saturating_sub(RESERVE))
}

pub fn status(a:&StorageAccount)->String{
    if a.provider_free_bytes<RESERVE{"RESERVE_BLOCKED"}
    else if a.app_used_bytes>=APP_CAP{"APP_FULL"}
    else if safe_available(a)<GIB{"NEAR_LIMIT"}
    else{"READY"}.into()
}

pub fn allocate<'a>(accounts:&'a[StorageAccount],file:u64)->Option<&'a StorageAccount>{
    accounts.iter().filter(|a|safe_available(a)>=file).max_by(|a,b|safe_available(a).cmp(&safe_available(b)).then_with(||b.id.cmp(&a.id)))
}

#[cfg(test)]
mod tests{
    use super::*;
    #[test]fn cap_blocks(){let a=StorageAccount::new("a","a",9*GIB,20*GIB);assert!(allocate(&[a],2*GIB).is_none());}
    #[test]fn reserve_blocks(){let a=StorageAccount::new("a","a",0,6*GIB);assert!(allocate(&[a],2*GIB).is_none());}
    #[test]fn chooses_more(){let a=StorageAccount::new("a","a",8*GIB,20*GIB);let b=StorageAccount::new("b","b",1*GIB,20*GIB);let v=vec![a,b];assert_eq!(allocate(&v,GIB).unwrap().id,"b");}
}
