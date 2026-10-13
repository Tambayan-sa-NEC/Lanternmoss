/** Title previews are descriptive, never destinations. Secret names stay masked. */
export function campaignRows(catalog, enemies) {
  return [...new Set(catalog.map(p => p.act))].map(act => ({ act, planets: catalog.filter(p => p.act === act).map(p => ({
    id: p.id, name: p.secret ? '?' : p.name, released: p.released, secret: p.secret,
    color: p.secret ? 0x83918e : p.palette?.ground?.[0] ?? 0x83918e,
    sky: p.secret ? 0xc7cbc5 : p.palette?.sky?.mid ?? 0xc7cbc5,
    detail: p.released ? p.secret ? 'Secret world' : (enemies[p.boss.type]?.name ?? '').split(',')[0] : p.secret ? 'Secret world · planned' : 'Planned',
    levels: p.secret ? '' : `Lv ${p.expectedLevel[0]}–${p.expectedLevel[1]}`,
  })) }));
}
