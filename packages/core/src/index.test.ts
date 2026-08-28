import { describe, expect, it } from 'vitest';
import { GIB, chooseAccount, safeAvailable, type StorageAccount } from './index';

describe('storage policy', () => {
  it('never lets app exceed 10 GiB', () => {
    const a:StorageAccount={id:'1',email:'a@gmail.com',appUsedBytes:9*GIB,providerFreeBytes:20*GIB};
    expect(safeAvailable(a)).toBe(1*GIB);
  });

  it('always preserves 5 GiB provider reserve', () => {
    const a:StorageAccount={id:'1',email:'a@gmail.com',appUsedBytes:0,providerFreeBytes:6*GIB};
    expect(safeAvailable(a)).toBe(1*GIB);
  });

  it('moves a file to another account when current account cannot fit it safely', () => {
    const accounts:StorageAccount[]=[
      {id:'1',email:'full@gmail.com',appUsedBytes:9.8*GIB,providerFreeBytes:5.1*GIB},
      {id:'2',email:'ready@gmail.com',appUsedBytes:2*GIB,providerFreeBytes:13*GIB},
    ];
    expect(chooseAccount(accounts, 1*GIB)?.id).toBe('2');
  });
});
