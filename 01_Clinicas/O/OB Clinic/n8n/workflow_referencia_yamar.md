# Workflow de Referência — n8n Agendamentos | OB Clinic
## Base: Yamar | Adaptação para: OB Clinic (Gi)

---

## O que precisa mudar para a OB Clinic

| Campo | Valor Yamar (referência) | Valor OB Clinic (a configurar) |
|---|---|---|
| `path` (webhook) | `AGENDAMENTOS_YAMAR` | `AGENDAMENTOS_OB_CLINIC` |
| `webhookId` | `prime-wh-001` | novo ID único |
| `unidadeChave` | `'yamar'` | `'ob_clinic'` |
| `subscriber_id` | `'6091062965829632'` | ⚠️ **A confirmar com a clínica** |
| `business_id` | `'6091062965829632'` | ⚠️ **A confirmar com a clínica** |
| `nome_unidade` | `'Yamar'` | `'OB Clinic'` |
| `nome_empresa` | `'Yamar'` | `'OB Clinic'` |
| `link_agenda` | `'177299'` | ⚠️ **A confirmar com a clínica** |
| `duracao_servico` | `45` | `45` (manter) |
| `capacidade_simultanea` | `2` | `1` (OB Clinic: 1 paciente por horário) |
| `profissional.id` | `'6194702674165760'` | ⚠️ **Dois profissionais: Dr. Valter e Dra. Eduarda** |
| `profissional.nome` | `'Jaqueline Akemi Yamashita'` | Dinâmico — ver nota abaixo |
| `authorization` (Basic) | `Basic eWFtYXI6NTEzYjgx...` | ⚠️ **A gerar com credenciais da OB Clinic** |
| `limite_dias_busca_normal` | `10` | `10` (manter ou ajustar) |
| Notas no agendamento | `"Agendamento realizado via IA (Yamar)"` | `"Agendamento realizado via IA (OB Clinic - Gi)"` |
| Cor do evento | `"#FF5733"` | Definir cor da OB Clinic (ex: `"#005BBB"` — azul) |

> [!IMPORTANT]
> A OB Clinic possui **dois dentistas** com dias bloqueados diferentes:
> - **Dr. Valter**: não atende às terças
> - **Dra. Eduarda**: não atende segundas nem sextas
>
> O nó `Configuracao Unidades` precisará de lógica adicional para selecionar dinamicamente o profissional conforme o dia solicitado. Isso substituirá o objeto `profissional` fixo do Yamar.

---

## Dados Pendentes para Configuração

Antes de adaptar o workflow, precisamos coletar os seguintes dados da API Clinicorp da OB Clinic:

- [ ] `subscriber_id` da OB Clinic
- [ ] `business_id` da OB Clinic
- [ ] `code_link` (link_agenda) da OB Clinic
- [ ] `id` do Dr. Valter na Clinicorp
- [ ] `id` da Dra. Eduarda na Clinicorp
- [ ] Credencial `Authorization` Basic (usuário + token da API)
- [ ] Credencial Supabase (se usar o mesmo dashboard ou novo)

---

## Estrutura dos Nós (Referência)

```
INICIO (Webhook POST)
  └─► Configuracao Unidades (Code — config mestre por unidade)
        └─► Guarda de Transito (Switch — roteia por ação)
              ├─► [Consultar]        Verificar Agenda Disponibilidade
              │                         └─► Logica Inteligente
              │                                 └─► Resp: Disponibilidade → LOG
              │
              ├─► [Agendar]          Verificar Agenda Agendar
              │                         └─► Validar Slot Agendar
              │                               └─► Slot Valido?
              │                                     ├─[Sim]─► Buscar Paciente → Paciente Existe?
              │                                     │               ├─[Sim]─► Unificar ID
              │                                     │               └─[Não]─► Criar Paciente → Unificar ID
              │                                     │                               └─► Agendar Na Clinicorp
              │                                     │                                       └─► Resp: Sucesso → LOG
              │                                     └─[Não]─► Resp: Erro → LOG
              │
              ├─► [Cancelar]         Buscar Paciente Cancelar
              │                         └─► Listar Agmts Cancelar
              │                               └─► Filtrar Agmt Cancelar
              │                                     └─► Achou Para Cancelar?
              │                                           ├─[Sim]─► Cancelar Na Clinicorp → Resp: Feito → LOG
              │                                           └─[Não]─► Resp: Não Encontrado → LOG
              │
              ├─► [Remarcar]         Buscar Paciente Remarcar
              │                         └─► Listar Agmts (data antiga)
              │                               └─► Filtrar Agmt Antigo
              │                                     └─► Achou o Antigo?
              │                                           ├─[Sim]─► Verificar Slots Novo
              │                                           │           └─► Validar Slot Remarcar
              │                                           │                 └─► Novo Horario Valido?
              │                                           │                       ├─[Sim]─► Cancelar Antigo → Recuperar → Reagendar → Resp: Sucesso → LOG
              │                                           │                       └─[Não]─► Resp: Horário Inválido → LOG
              │                                           └─[Não]─► Resp: Antigo Não Encontrado → LOG
              │
              └─► [Verificar Paciente] Buscar Paciente Verificar
                                          └─► Listar Agmts (futuros)
                                                └─► Filtrar Próximo Agmt
                                                      └─► Encontrou Próximo?
                                                            ├─[Sim]─► Resp: Encontrado → LOG
                                                            └─[Não]─► Resp: Não Encontrado → LOG
```

---

## JSON Completo do Workflow (Referência Yamar)

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
        "jsCode": "// --- CONFIGURAÇÃO MESTRE: Yamar---\nconst body = $input.item.json.body || $input.item.json;\nconst telefoneRaw = body.telefone_cliente || body.telefone_contato || body.telefone || '';\nconst telefoneLimpo = telefoneRaw.toString().replace(/\\D/g, '');\nconst nomePaciente = body.nome_cliente || body.nome_contato || 'Paciente';\nconst insistiu = body.insistiu === true || body.insistiu === 'true';\nconst TIMEZONE = 'America/Sao_Paulo';\nconst unidadeChave = 'yamar';\nconst CONFIGS = {\n  yamar: {\n    subscriber_id:            '6091062965829632',\n    business_id:              '6091062965829632',\n    nome_unidade:             'Yamar',\n    nome_empresa:             'Yamar',\n    link_agenda:              '177299',\n    duracao_servico:          45,\n    capacidade_simultanea:    2,\n    timezone:                 TIMEZONE,\n    limite_dias_busca_normal: 10,\n    profissional: { id: '6194702674165760', nome: 'Jaqueline Akemi Yamashita' },\n    authorization: 'Basic ' + Buffer.from('yamar:513b819a-fa96-4c40-94da-0e2ff08a6511').toString('base64')\n  },\n};\nconst CONFIG = CONFIGS[unidadeChave];\nconst hoje = DateTime.now().setZone(TIMEZONE);\nconst dataInicio = hoje.toFormat('yyyy-MM-dd');\nconst dataRaw = body.data_iso || body.data_inicio || body.data_agendada || '';\nlet dtP = null;\nif (dataRaw) {\n  dtP = DateTime.fromISO(dataRaw, { zone: TIMEZONE });\n  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });\n  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'dd/MM/yyyy HH:mm', { zone: TIMEZONE });\n}\nconst horaDoISO = (dtP && dtP.isValid && (dtP.hour > 0 || dtP.minute > 0)) ? dtP.toFormat('HH:mm') : '';\nconst horaFinal = (body.horario_agendado && body.horario_agendado.length >= 4) ? body.horario_agendado : (body.horario && body.horario.length >= 4) ? body.horario : horaDoISO;\nconst dataFinal = (dtP && dtP.isValid) ? dtP.toFormat('yyyy-MM-dd') : '';\nconst dataFim = (dtP && dtP.isValid) ? dtP.plus({ days: 7 }).toFormat('yyyy-MM-dd') : hoje.plus({ days: 7 }).toFormat('yyyy-MM-dd');\nreturn {\n  json: {\n    acao_fluxo: body.action || body.acao_fluxo,\n    nome_paciente: nomePaciente,\n    telefone_limpo: telefoneLimpo,\n    insistiu: insistiu,\n    data_nascimento: body.data_nascimento || '',\n    data_inicio: dataInicio,\n    data_agendada: dataFinal,\n    data_antiga: body.data_antiga || body['data-antiga'] || '',\n    data_fim: dataFim,\n    horario_agendado: horaFinal,\n    config_agenda: {\n      subscriber_id: CONFIG.subscriber_id,\n      business_id: CONFIG.business_id,\n      nome_unidade: CONFIG.nome_unidade,\n      nome_empresa: CONFIG.nome_empresa,\n      link_agenda: CONFIG.link_agenda,\n      duracao_servico: CONFIG.duracao_servico,\n      capacidade_simultanea: CONFIG.capacidade_simultanea,\n      timezone: CONFIG.timezone,\n      limite_dias_busca_normal: CONFIG.limite_dias_busca_normal,\n      profissional: CONFIG.profissional,\n      authorization: CONFIG.authorization\n    }\n  }\n};"
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
> O JSON completo do workflow Yamar está documentado integralmente neste arquivo como referência.
> Para importar no n8n, copie o JSON do bloco acima e use **Importar Workflow** no painel.

---

## Próximos Passos para a OB Clinic

1. **Coletar os dados da API Clinicorp** (tabela acima)
2. **Adaptar o nó `Configuracao Unidades`** com os dados da OB Clinic
3. **Criar lógica de dois dentistas** no nó de configuração (seleção dinâmica por dia da semana)
4. **Atualizar os headers Authorization** hardcoded nos nós de agendamento/remarcação
5. **Atualizar as `Notes` e `CategoryColor`** nos nós de criação de appointment
6. **Testar com pinData** usando telefone e nome da OB Clinic
