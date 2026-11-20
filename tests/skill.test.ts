import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from '../src/load.js';

const SCRIPT = join(ROOT, 'skills', 'cost-effective-cat-guide', 'scripts', 'search.mjs');
const run = (...args: string[]) => execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

describe('AI skill search script', () => {
  it('finds the urinary-obstruction emergency from a colloquial question and flags it', () => {
    const out = run('猫一直蹲猫砂盆尿不出来');
    expect(out).toContain('CG-0007');
    expect(out).toContain('🚨');
    expect(out.indexOf('CG-0007')).toBeLessThan(out.indexOf('## 其他相关条目') === -1 ? Infinity : out.indexOf('## 其他相关条目'));
  });

  it('prints sources with what they support', () => {
    const out = run('--id', 'CG-0003');
    expect(out).toContain('支持了什么');
    expect(out).toContain('证据');
  });

  it('says clearly when the guide has nothing', () => {
    expect(run('量子力学')).toContain('指南中没有这方面的内容');
  });

  it('never prints dose-like strings', () => {
    const out = run('--emergency') + run('中毒') + run('止痛药');
    expect(out).not.toMatch(/\d\s*(mg|毫克)\s*\/\s*(kg|公斤)/i);
  });
});
