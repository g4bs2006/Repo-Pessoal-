const TOKEN = '***REMOVIDO***'
const PANEL_ID = 'fd4df083-7422-4171-9ee2-1c098e799798'

async function test() {
  const qs = new URLSearchParams({ PanelId: PANEL_ID, PageSize: 50, PageNumber: 1 })
  const res = await fetch(`https://api.wts.chat/crm/v1/panel/card?${qs}`, {
    headers: { Authorization: TOKEN }
  })
  const json = await res.json()
  const linked = json.items.filter(c => c.contactIds && c.contactIds.length > 0)
  console.log("Cards vinculados a contatos:", linked.length)
  if (linked.length > 0) {
    console.log("Exemplo de contactIds:", linked[0].contactIds)
  }
}

test()
