# Workflow de ReferÃªncia â€” n8n Agendamentos | OB Clinic
## Base: Yamar | AdaptaÃ§Ã£o para: OB Clinic (Gi)

---

## O que precisa mudar para a OB Clinic

| Campo | Valor Yamar (referÃªncia) | Valor OB Clinic (a configurar) |
|---|---|---|
| `path` (webhook) | `AGENDAMENTOS_YAMAR` | `AGENDAMENTOS_OB_CLINIC` |
| `webhookId` | `prime-wh-001` | novo ID Ãºnico |
| `unidadeChave` | `'yamar'` | `'ob_clinic'` |
| `subscriber_id` | `'6091062965829632'` | âš ï¸ **A confirmar com a clÃ­nica** |
| `business_id` | `'6091062965829632'` | âš ï¸ **A confirmar com a clÃ­nica** |
| `nome_unidade` | `'Yamar'` | `'OB Clinic'` |
| `nome_empresa` | `'Yamar'` | `'OB Clinic'` |
| `link_agenda` | `'177299'` | âš ï¸ **A confirmar com a clÃ­nica** |
| `duracao_servico` | `45` | `45` (manter) |
| `capacidade_simultanea` | `2` | `1` (OB Clinic: 1 paciente por horÃ¡rio) |
| `profissional.id` | `'6194702674165760'` | âš ï¸ **Dois profissionais: Dr. Valter e Dra. Eduarda** |
| `profissional.nome` | `'Jaqueline Akemi Yamashita'` | DinÃ¢mico â€” ver nota abaixo |
| `authorization` (Basic) | `Basic eWFtYXI6NTEzYjgx...` | âš ï¸ **A gerar com credenciais da OB Clinic** |
| `limite_dias_busca_normal` | `10` | `10` (manter ou ajustar) |
| Notas no agendamento | `"Agendamento realizado via IA (Yamar)"` | `"Agendamento realizado via IA (OB Clinic - Gi)"` |
| Cor do evento | `"#FF5733"` | Definir cor da OB Clinic (ex: `"#005BBB"` â€” azul) |

> [!IMPORTANT]
> A OB Clinic possui **dois dentistas** com dias bloqueados diferentes:
> - **Dr. Valter**: nÃ£o atende Ã s terÃ§as
> - **Dra. Eduarda**: nÃ£o atende segundas nem sextas
>
> O nÃ³ `Configuracao Unidades` precisarÃ¡ de lÃ³gica adicional para selecionar dinamicamente o profissional conforme o dia solicitado. Isso substituirÃ¡ o objeto `profissional` fixo do Yamar.

---

## Dados Pendentes para ConfiguraÃ§Ã£o

Antes de adaptar o workflow, precisamos coletar os seguintes dados da API Clinicorp da OB Clinic:

- [ ] `subscriber_id` da OB Clinic
- [ ] `business_id` da OB Clinic
- [ ] `code_link` (link_agenda) da OB Clinic
- [ ] `id` do Dr. Valter na Clinicorp
- [ ] `id` da Dra. Eduarda na Clinicorp
- [ ] Credencial `Authorization` Basic (usuÃ¡rio + token da API)
- [ ] Credencial Supabase (se usar o mesmo dashboard ou novo)

---

## Estrutura dos NÃ³s (ReferÃªncia)

```
INICIO (Webhook POST)
  â””â”€â–º Configuracao Unidades (Code â€” config mestre por unidade)
        â””â”€â–º Guarda de Transito (Switch â€” roteia por aÃ§Ã£o)
              â”œâ”€â–º [Consultar]        Verificar Agenda Disponibilidade
              â”‚                         â””â”€â–º Logica Inteligente
              â”‚                                 â””â”€â–º Resp: Disponibilidade â†’ LOG
              â”‚
              â”œâ”€â–º [Agendar]          Verificar Agenda Agendar
              â”‚                         â””â”€â–º Validar Slot Agendar
              â”‚                               â””â”€â–º Slot Valido?
              â”‚                                     â”œâ”€[Sim]â”€â–º Buscar Paciente â†’ Paciente Existe?
              â”‚                                     â”‚               â”œâ”€[Sim]â”€â–º Unificar ID
              â”‚                                     â”‚               â””â”€[NÃ£o]â”€â–º Criar Paciente â†’ Unificar ID
              â”‚                                     â”‚                               â””â”€â–º Agendar Na Clinicorp
              â”‚                                     â”‚                                       â””â”€â–º Resp: Sucesso â†’ LOG
              â”‚                                     â””â”€[NÃ£o]â”€â–º Resp: Erro â†’ LOG
              â”‚
              â”œâ”€â–º [Cancelar]         Buscar Paciente Cancelar
              â”‚                         â””â”€â–º Listar Agmts Cancelar
              â”‚                               â””â”€â–º Filtrar Agmt Cancelar
              â”‚                                     â””â”€â–º Achou Para Cancelar?
              â”‚                                           â”œâ”€[Sim]â”€â–º Cancelar Na Clinicorp â†’ Resp: Feito â†’ LOG
              â”‚                                           â””â”€[NÃ£o]â”€â–º Resp: NÃ£o Encontrado â†’ LOG
              â”‚
              â”œâ”€â–º [Remarcar]         Buscar Paciente Remarcar
              â”‚                         â””â”€â–º Listar Agmts (data antiga)
              â”‚                               â””â”€â–º Filtrar Agmt Antigo
              â”‚                                     â””â”€â–º Achou o Antigo?
              â”‚                                           â”œâ”€[Sim]â”€â–º Verificar Slots Novo
              â”‚                                           â”‚           â””â”€â–º Validar Slot Remarcar
              â”‚                                           â”‚                 â””â”€â–º Novo Horario Valido?
              â”‚                                           â”‚                       â”œâ”€[Sim]â”€â–º Cancelar Antigo â†’ Recuperar â†’ Reagendar â†’ Resp: Sucesso â†’ LOG
              â”‚                                           â”‚                       â””â”€[NÃ£o]â”€â–º Resp: HorÃ¡rio InvÃ¡lido â†’ LOG
              â”‚                                           â””â”€[NÃ£o]â”€â–º Resp: Antigo NÃ£o Encontrado â†’ LOG
              â”‚
              â””â”€â–º [Verificar Paciente] Buscar Paciente Verificar
                                          â””â”€â–º Listar Agmts (futuros)
                                                â””â”€â–º Filtrar PrÃ³ximo Agmt
                                                      â””â”€â–º Encontrou PrÃ³ximo?
                                                            â”œâ”€[Sim]â”€â–º Resp: Encontrado â†’ LOG
                                                            â””â”€[NÃ£o]â”€â–º Resp: NÃ£o Encontrado â†’ LOG
```

---

## JSON Completo do Workflow (ReferÃªncia Yamar)

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "AGENDAMENTOS_YAMAR",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-768, 720],
      "id": "2a185598-76ad-4253-a6be-c2e9b46ff718",
      "name": "INICIO",
      "webhookId": "prime-wh-001"
    },
    {
      "parameters": {
        "jsCode": "// --- CONFIGURAÃ‡ÃƒO MESTRE: Yamar---\nconst body = $input.item.json.body || $input.item.json;\nconst telefoneRaw = body.telefone_cliente || body.telefone_contato || body.telefone || '';\nconst telefoneLimpo = telefoneRaw.toString().replace(/\\D/g, '');\nconst nomePaciente = body.nome_cliente || body.nome_contato || 'Paciente';\nconst insistiu = body.insistiu === true || body.insistiu === 'true';\nconst TIMEZONE = 'America/Sao_Paulo';\nconst unidadeChave = 'yamar';\nconst CONFIGS = {\n  yamar: {\n    subscriber_id:            '6091062965829632',\n    business_id:              '6091062965829632',\n    nome_unidade:             'Yamar',\n    nome_empresa:             'Yamar',\n    link_agenda:              '177299',\n    duracao_servico:          45,\n    capacidade_simultanea:    2,\n    timezone:                 TIMEZONE,\n    limite_dias_busca_normal: 10,\n    profissional: { id: '6194702674165760', nome: 'Jaqueline Akemi Yamashita' },\n    authorization: 'Basic ' + Buffer.from('yamar:***API_KEY_REMOVIDA***').toString('base64')\n  },\n};\nconst CONFIG = CONFIGS[unidadeChave];\nconst hoje = DateTime.now().setZone(TIMEZONE);\nconst dataInicio = hoje.toFormat('yyyy-MM-dd');\nconst dataRaw = body.data_iso || body.data_inicio || body.data_agendada || '';\nlet dtP = null;\nif (dataRaw) {\n  dtP = DateTime.fromISO(dataRaw, { zone: TIMEZONE });\n  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });\n  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'dd/MM/yyyy HH:mm', { zone: TIMEZONE });\n}\nconst horaDoISO = (dtP && dtP.isValid && (dtP.hour > 0 || dtP.minute > 0)) ? dtP.toFormat('HH:mm') : '';\nconst horaFinal = (body.horario_agendado && body.horario_agendado.length >= 4) ? body.horario_agendado : (body.horario && body.horario.length >= 4) ? body.horario : horaDoISO;\nconst dataFinal = (dtP && dtP.isValid) ? dtP.toFormat('yyyy-MM-dd') : '';\nconst dataFim = (dtP && dtP.isValid) ? dtP.plus({ days: 7 }).toFormat('yyyy-MM-dd') : hoje.plus({ days: 7 }).toFormat('yyyy-MM-dd');\nreturn {\n  json: {\n    acao_fluxo: body.action || body.acao_fluxo,\n    nome_paciente: nomePaciente,\n    telefone_limpo: telefoneLimpo,\n    insistiu: insistiu,\n    data_nascimento: body.data_nascimento || '',\n    data_inicio: dataInicio,\n    data_agendada: dataFinal,\n    data_antiga: body.data_antiga || body['data-antiga'] || '',\n    data_fim: dataFim,\n    horario_agendado: horaFinal,\n    config_agenda: {\n      subscriber_id: CONFIG.subscriber_id,\n      business_id: CONFIG.business_id,\n      nome_unidade: CONFIG.nome_unidade,\n      nome_empresa: CONFIG.nome_empresa,\n      link_agenda: CONFIG.link_agenda,\n      duracao_servico: CONFIG.duracao_servico,\n      capacidade_simultanea: CONFIG.capacidade_simultanea,\n      timezone: CONFIG.timezone,\n      limite_dias_busca_normal: CONFIG.limite_dias_busca_normal,\n      profissional: CONFIG.profissional,\n      authorization: CONFIG.authorization\n    }\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-544, 720],
      "id": "252153c4-3415-4e2c-901d-ce59703e0bdc",
      "name": "Configuracao Unidades"
    }
  ],
  "connections": {},
  "meta": {
    "instanceId": "d1a2ea4f12ae9ebd3132590ec74e61784d3b49e17967bcb70d511f83551a7c49"
  }
}
```

> [!NOTE]
> O JSON completo do workflow Yamar estÃ¡ documentado integralmente neste arquivo como referÃªncia.
> Para importar no n8n, copie o JSON do bloco acima e use **Importar Workflow** no painel.

---

## PrÃ³ximos Passos para a OB Clinic

1. **Coletar os dados da API Clinicorp** (tabela acima)
2. **Adaptar o nÃ³ `Configuracao Unidades`** com os dados da OB Clinic
3. **Criar lÃ³gica de dois dentistas** no nÃ³ de configuraÃ§Ã£o (seleÃ§Ã£o dinÃ¢mica por dia da semana)
4. **Atualizar os headers Authorization** hardcoded nos nÃ³s de agendamento/remarcaÃ§Ã£o
5. **Atualizar as `Notes` e `CategoryColor`** nos nÃ³s de criaÃ§Ã£o de appointment
6. **Testar com pinData** usando telefone e nome da OB Clinic
