import { test, expect } from 'vitest';
import { textNamesCountryOrPlace } from '../functions/_lib/noteText';
test('x',()=>{expect(['波蘭僅為未經證實的可能候選地','該品牌源自英國並在歐洲製造','歐洲','英國','波蘭','Europe'].map(s=>textNamesCountryOrPlace(s))).toEqual([]);});
