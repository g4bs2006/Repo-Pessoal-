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
      "position": [
        -768,
        720
      ],
      "id": "2a185598-76ad-4253-a6be-c2e9b46ff718",
      "name": "INICIO",
      "webhookId": "prime-wh-001"
    },
    {
      "parameters": {
        "jsCode": "// --- CONFIGURAÇÃO MESTRE: Yamar---\nconst body = $input.item.json.body || $input.item.json;\nconst telefoneRaw = body.telefone_cliente || body.telefone_contato || body.telefone || '';\nconst telefoneLimpo = telefoneRaw.toString().replace(/\\D/g, '');\nconst nomePaciente = body.nome_cliente || body.nome_contato || 'Paciente';\nconst insistiu = body.insistiu === true || body.insistiu === 'true';\nconst horarioPreferido = (body.horario_preferido || '').trim();\nconst isPeriodo = /manh[aã]|tarde/i.test(horarioPreferido);\nconst periodoPreferencia = isPeriodo ? (/tarde/i.test(horarioPreferido) ? 'tarde' : 'manha') : '';\nconst TIMEZONE = 'America/Sao_Paulo';\n// ── Unidade única ──────────────────────────────────────\nconst unidadeChave = 'yamar';\n// ── Configurações por unidade ──────────────────────────────────\nconst CONFIGS = {\n  yamar: {\n    subscriber_id:            '6091062965829632',\n    business_id:              '6091062965829632',\n    nome_unidade:             'Yamar',\n    nome_empresa:             'Yamar',\n    link_agenda:              '177299',\n    duracao_servico:          45,\n    capacidade_simultanea:    2,\n    timezone:                 TIMEZONE,\n    limite_dias_busca_normal: 10,\n    profissional: { id: '6194702674165760', nome: 'Jaqueline Akemi Yamashita' },\n    authorization: 'Basic ' + Buffer.from('yamar:513b819a-fa96-4c40-94da-0e2ff08a6511').toString('base64')\n  },\n};\nconst CONFIG = CONFIGS[unidadeChave];\n// ── Parse de datas — aceita ISO completo e destrincha data + hora ──\nconst hoje       = DateTime.now().setZone(TIMEZONE);\nconst dataInicio = hoje.toFormat('yyyy-MM-dd');\nconst dataRaw = body.data_iso || body.data_inicio || body.data_agendada || '';\nlet dtP = null;\nif (dataRaw) {\n  dtP = DateTime.fromISO(dataRaw, { zone: TIMEZONE });\n  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });\n  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'dd/MM/yyyy HH:mm', { zone: TIMEZONE });\n}\n// hora embutida no ISO (ex: \"2026-03-11T14:00:00\")\nconst horaDoISO = (dtP && dtP.isValid && (dtP.hour > 0 || dtP.minute > 0))\n  ? dtP.toFormat('HH:mm') : '';\n// prioridade: horario_agendado > horario > hora do ISO\nconst horaEspecifica = !isPeriodo && horarioPreferido.includes(':') ? horarioPreferido : '';\nconst horaFinal = horaEspecifica\n  || ((body.horario_agendado && body.horario_agendado.length >= 4) ? body.horario_agendado : '')\n  || ((body.horario && body.horario.length >= 4) ? body.horario : '')\n  || horaDoISO;\nconst dataFinal = (dtP && dtP.isValid) ? dtP.toFormat('yyyy-MM-dd') : '';\nconst dataFim   = (dtP && dtP.isValid)\n  ? dtP.plus({ days: 7 }).toFormat('yyyy-MM-dd')\n  : hoje.plus({ days: 7 }).toFormat('yyyy-MM-dd');\nreturn {\n  json: {\n    acao_fluxo:        body.action || body.acao_fluxo,\n    nome_paciente:     nomePaciente,\n    telefone_limpo:    telefoneLimpo,\n    insistiu:          insistiu,\n    data_nascimento:   body.data_nascimento || '',\n    data_inicio:       dataInicio,\n    data_agendada:     dataFinal,\n    data_antiga:       body.data_antiga || body['data-antiga'] || '',\n    data_fim:          dataFim,\n    horario_agendado:  horaFinal,\n    horario_preferido:   horarioPreferido,\n    periodo_preferencia: periodoPreferencia,\n    config_agenda: {\n      subscriber_id:            CONFIG.subscriber_id,\n      business_id:              CONFIG.business_id,\n      nome_unidade:             CONFIG.nome_unidade,\n      nome_empresa:             CONFIG.nome_empresa,\n      link_agenda:              CONFIG.link_agenda,\n      duracao_servico:          CONFIG.duracao_servico,\n      capacidade_simultanea:    CONFIG.capacidade_simultanea,\n      timezone:                 CONFIG.timezone,\n      limite_dias_busca_normal: CONFIG.limite_dias_busca_normal,\n      profissional:             CONFIG.profissional,\n      authorization:            CONFIG.authorization\n    }\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -544,
        720
      ],
      "id": "252153c4-3415-4e2c-901d-ce59703e0bdc",
      "name": "Configuracao Unidades"
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "version": 2,
                  "leftValue": "",
                  "caseSensitive": true,
                  "typeValidation": "strict"
                },
                "conditions": [
                  {
                    "id": "r1",
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "verificar_disponibilidade",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Consultar"
            },
            {
              "conditions": {
                "options": {
                  "version": 2,
                  "leftValue": "",
                  "caseSensitive": true,
                  "typeValidation": "strict"
                },
                "conditions": [
                  {
                    "id": "r2",
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "realizar_agendamento",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Agendar"
            },
            {
              "conditions": {
                "options": {
                  "version": 2,
                  "leftValue": "",
                  "caseSensitive": true,
                  "typeValidation": "strict"
                },
                "conditions": [
                  {
                    "id": "r3",
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "cancelar_agendamento",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Cancelar"
            },
            {
              "conditions": {
                "options": {
                  "version": 2,
                  "leftValue": "",
                  "caseSensitive": true,
                  "typeValidation": "strict"
                },
                "conditions": [
                  {
                    "id": "r4",
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "remarcar_agendamento",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Remarcar"
            },
            {
              "conditions": {
                "options": {
                  "version": 2,
                  "leftValue": "",
                  "caseSensitive": true,
                  "typeValidation": "strict"
                },
                "conditions": [
                  {
                    "id": "r5",
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "verificar_agendamento_paciente",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "Verificar Paciente"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.3,
      "position": [
        -320,
        672
      ],
      "id": "c7bf09b0-c0e9-4e66-9b11-31ed28f84b12",
      "name": "Guarda de Transito"
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/appointment/get_avaliable_days",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "code_link",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.link_agenda }}"
            },
            {
              "name": "from",
              "value": "={{ $json.data_inicio }}"
            },
            {
              "name": "to",
              "value": "={{ $json.data_fim }}"
            },
            {
              "name": "showAvailableTimes",
              "value": "True"
            },
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        -96,
        48
      ],
      "id": "594f46e5-943a-4ba2-b923-eb2dc9b660bf",
      "name": "Verificar Agenda Disponibilidade",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "// =============================================================\n// LÓGICA INTELIGENTE — Yamar (multi-day)\n// Formato: [{ Date, Week, DayWeek, AvaliableTimes:[{from,to,professionalId}], jsonDate }]\n// =============================================================\n\n// ── 1. CONFIGURAÇÃO ───────────────────────────────────────────\nconst cfgNode = $('Configuracao Unidades').first().json;\nconst ca = cfgNode.config_agenda || {};\n\nconst TIMEZONE  = ca.timezone || 'America/Sao_Paulo';\nconst DUR_MIN   = ca.duracao_servico || 45;\nconst LIMITE_DIAS = ca.limite_dias_busca_normal || 7;\n\n// Profissional da unidade (vem do config_agenda)\nconst PROF_ID   = String(ca.profissional?.id || '');\nconst PROF_NOME = ca.profissional?.nome || 'Profissional';\n\n// ── 2. INPUT ──────────────────────────────────────────────────\nconst diasAPI = $input.all().map(i => i.json);\n\n// ── 3. DADOS DO PEDIDO ────────────────────────────────────────\nconst insistiu = cfgNode.insistiu === true;\nconst hRaw = cfgNode.horario_agendado || '';\nconst dRaw = cfgNode.data_agendada || '';   // yyyy-MM-dd\nconst periodoPreferencia = cfgNode.periodo_preferencia || '';  // 'manha' | 'tarde' | ''\nconst agora = DateTime.now().setZone(TIMEZONE);\n\nlet dtSolicitado = null;\nif (dRaw && hRaw) {\n  dtSolicitado = DateTime.fromFormat(`${dRaw} ${hRaw}`, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });\n}\n\nlet diffDias = 0, bloqueado = false;\nif (dtSolicitado?.isValid) {\n  diffDias = dtSolicitado.startOf('day').diff(agora.startOf('day'), 'days').days;\n  if (diffDias > LIMITE_DIAS && !insistiu) bloqueado = true;\n}\n\n// ── 4. HELPERS ────────────────────────────────────────────────\nfunction horaParaMin(str) {\n  if (!str) return -1;\n  const p = str.split(':');\n  return parseInt(p[0]) * 60 + parseInt(p[1] || '0');\n}\n\nfunction sugerirEspalhados(blocos, n = 3) {\n  const porDia = {};\n  for (const b of blocos) {\n    if (!porDia[b.data]) porDia[b.data] = b;\n  }\n  const dias = Object.keys(porDia).sort();\n  if (dias.length <= n) return dias.map(d => porDia[d]);\n  const resultado = [];\n  const passo = (dias.length - 1) / (n - 1);\n  for (let i = 0; i < n; i++) resultado.push(porDia[dias[Math.round(i * passo)]]);\n  return resultado;\n}\n\n// ── 5. PROCESSAR UM DIA ───────────────────────────────────────\n// Cada slot de 45 min disponível da Dra. = bloco válido\nfunction processarDia(dia) {\n  const slots = (dia.AvaliableTimes || []).filter(s => s.isSelectable !== false);\n  const blocos = [];\n  for (const slot of slots) {\n    if (String(slot.professionalId) !== PROF_ID) continue;\n    blocos.push({\n      data:        dia.jsonDate,\n      semana:      dia.Week,\n      minutos:     horaParaMin(slot.from),\n      horario:     slot.from,\n      horario_fim: slot.to,\n      profId:      PROF_ID,\n      profNome:    PROF_NOME\n    });\n  }\n  return blocos.sort((a, b) => a.minutos - b.minutos);\n}\n\n// ── 6. TODOS OS BLOCOS ────────────────────────────────────────\nlet todosBlocos = [];\nfor (const dia of diasAPI) todosBlocos = todosBlocos.concat(processarDia(dia));\n\n// ── 7. FORMATAÇÃO ─────────────────────────────────────────────\nconst fmtBloco = b => {\n  const [yyyy, mm, dd] = b.data.split('-');\n  return `🗓️ *${dd}/${mm} (${b.semana})* às *${b.horario}* – *${b.horario_fim}* com ${b.profNome}`;\n};\n\nconst dtLabel = dtSolicitado?.isValid\n  ? dtSolicitado.setLocale('pt-BR').toFormat('dd/MM (cccc)')\n  : (dRaw || 'data solicitada');\n\n// ── 8. DECISÃO PRINCIPAL ──────────────────────────────────────\nlet resultado, exactMatch = false;\nconst sugestoesHorarios = [];\n\n// CAMINHO PERÍODO — paciente escolheu manhã ou tarde\nif (periodoPreferencia) {\n  const faixas = {\n    manha: { inicio: 8*60,      fim: 12*60   },\n    tarde: { inicio: 13*60+30,  fim: 18*60+1 }\n  };\n  const faixa = faixas[periodoPreferencia] || faixas.manha;\n  const labelPeriodo = periodoPreferencia === 'manha' ? 'manhã' : 'tarde';\n  const labelOutro   = periodoPreferencia === 'manha' ? 'tarde' : 'manhã';\n  const dataMinima = dtSolicitado?.isValid ? dtSolicitado.toFormat('yyyy-MM-dd') : agora.toFormat('yyyy-MM-dd');\n  const blocosPeriodo = todosBlocos.filter(b => b.minutos >= faixa.inicio && b.minutos < faixa.fim && b.data >= dataMinima);\n  if (blocosPeriodo.length === 0) {\n    resultado = `😕 Não há horários disponíveis no período da *${labelPeriodo}* para *${dtLabel}*.\\n\\nTemos opções no período da *${labelOutro}*. Prefere que eu verifique?`;\n  } else {\n    const primeiro = blocosPeriodo[0];\n    sugestoesHorarios.push(`${primeiro.data} ${primeiro.horario}`);\n    const blocosMesmoDia = blocosPeriodo.filter(b => b.data === primeiro.data);\n    const segundoMesmoDia = blocosMesmoDia.find(b => b.minutos - primeiro.minutos >= 120);\n    const segundo = segundoMesmoDia || blocosPeriodo.find(b => b.data > primeiro.data);\n    if (segundo) {\n      sugestoesHorarios.push(`${segundo.data} ${segundo.horario}`);\n      resultado = `📅 Encontrei dois horários disponíveis no período da *${labelPeriodo}*:\\n\\n${fmtBloco(primeiro)}\\n${fmtBloco(segundo)}\\n\\nQual desses fica melhor para você?`;\n    } else {\n      resultado = `📅 Encontrei o seguinte horário no período da *${labelPeriodo}*:\\n\\n${fmtBloco(primeiro)}\\n\\nEsse horário funciona para você?`;\n    }\n  }\n}\n\n// CAMINHO A — Data distante + NÃO insistiu\nelse if (bloqueado) {\n  const limiteData = agora.startOf('day').plus({ days: LIMITE_DIAS }).toFormat('yyyy-MM-dd');\n  const proximos = sugerirEspalhados(todosBlocos.filter(b => b.data <= limiteData), 2);\n  if (proximos.length === 0) {\n    resultado = `😕 Não há horários disponíveis nos próximos ${LIMITE_DIAS} dias.\\n\\nPosso verificar outra data?`;\n  } else {\n    proximos.forEach(b => sugestoesHorarios.push(`${b.data} ${b.horario}`));\n    resultado =\n      `⚠️ A data que você pediu (*${dtLabel}*) está a *${Math.ceil(diffDias)} dias* de hoje.\\n\\n` +\n      `Para garantir um atendimento mais rápido, separei os horários disponíveis mais próximos:\\n\\n` +\n      proximos.map(fmtBloco).join('\\n');\n  }\n}\n\n// CAMINHO B — Data distante + insistiu\nelse if (diffDias > LIMITE_DIAS && insistiu) {\n  const dataAlvo = dtSolicitado.toFormat('yyyy-MM-dd');\n  const minSolicitado = (hRaw && hRaw !== '00:00') ? horaParaMin(hRaw) : -1;\n  const blocosDoDia = todosBlocos.filter(b => b.data === dataAlvo);\n  const blocoExato = minSolicitado >= 0 ? blocosDoDia.find(b => b.minutos === minSolicitado) : null;\n\n  if (blocoExato) {\n    exactMatch = true;\n    sugestoesHorarios.push(`${blocoExato.data} ${blocoExato.horario}`);\n    resultado = `✅ Consegui o horário que você pediu!\\n\\n${fmtBloco(blocoExato)}\\n\\nConfirmo o agendamento?`;\n  } else if (blocosDoDia.length === 0) {\n    resultado = `😕 Não há horários disponíveis em *${dtLabel}*.\\n\\nPosso verificar um dia antes ou depois?`;\n  } else {\n    const antes = [...blocosDoDia].filter(b => b.minutos < minSolicitado).slice(-1);\n    const depois = blocosDoDia.filter(b => b.minutos > minSolicitado).slice(0, 1);\n    const opcoes = (antes.length + depois.length > 0) ? [...antes, ...depois] : blocosDoDia.slice(0, 2);\n    opcoes.forEach(b => sugestoesHorarios.push(`${b.data} ${b.horario}`));\n    resultado =\n      `O horário das *${hRaw}* não está disponível em *${dtLabel}*, mas encontrei as opções mais próximas:\\n\\n` +\n      opcoes.map(fmtBloco).join('\\n') + `\\n\\nQual prefere? Ou verifico outro dia?`;\n  }\n}\n\n// CAMINHOS C / D — Data normal (≤ 7 dias)\nelse {\n  const dataAlvo = dtSolicitado?.isValid ? dtSolicitado.toFormat('yyyy-MM-dd') : null;\n  const minSolicitado = (hRaw && hRaw !== '00:00') ? horaParaMin(hRaw) : -1;\n  const blocosDoDia = dataAlvo ? todosBlocos.filter(b => b.data === dataAlvo) : todosBlocos;\n  const blocoExato = (minSolicitado >= 0 && blocosDoDia.length > 0)\n    ? blocosDoDia.find(b => b.minutos === minSolicitado) : null;\n\n  if (blocoExato) {\n    exactMatch = true;\n    sugestoesHorarios.push(`${blocoExato.data} ${blocoExato.horario}`);\n    resultado =\n      `✅ Ótima notícia! O horário *${dtLabel} às ${blocoExato.horario}* está disponível ` +\n      `com *${blocoExato.profNome}*.\\n\\nPosso confirmar sua avaliação?`;\n  } else if (blocosDoDia.length === 0) {\n    const proximos = sugerirEspalhados(todosBlocos, 2);\n    if (proximos.length === 0) {\n      resultado = `😕 Não há horários disponíveis no período consultado. Posso verificar outras datas?`;\n    } else {\n      proximos.forEach(b => sugestoesHorarios.push(`${b.data} ${b.horario}`));\n      resultado =\n        `😕 Não há horários disponíveis em *${dtLabel}*.\\n\\nEncontrei estas opções nos próximos dias:\\n\\n` +\n        proximos.map(fmtBloco).join('\\n') + `\\n\\nQual desses fica melhor para você?`;\n    }\n  } else {\n    let opcoes;\n    if (minSolicitado >= 0) {\n      const antesCD = [...blocosDoDia].filter(b => b.minutos < minSolicitado).slice(-1);\n      const depoisCD = blocosDoDia.filter(b => b.minutos > minSolicitado).slice(0, 1);\n      opcoes = (antesCD.length + depoisCD.length > 0) ? [...antesCD, ...depoisCD] : blocosDoDia.slice(0, 2);\n    } else {\n      opcoes = blocosDoDia.slice(0, 2);\n    }\n    opcoes.forEach(b => sugestoesHorarios.push(`${b.data} ${b.horario}`));\n    const intro = minSolicitado >= 0\n      ? `O horário das *${hRaw}* não está disponível para *${dtLabel}*, mas encontrei as opções mais próximas:`\n      : `Encontrei os seguintes horários disponíveis para *${dtLabel}*:`;\n    resultado = `📅 ${intro}\\n\\n` + opcoes.map(fmtBloco).join('\\n') + `\\n\\nQual desses fica melhor para você?`;\n  }\n}\n\n// ── 9. OUTPUT ─────────────────────────────────────────────────\nreturn {\n  json: {\n    resultado,\n    sugestoes_horarios:      sugestoesHorarios,\n    data_distante_bloqueada: bloqueado,\n    exact_match:             exactMatch,\n    diff_dias:               Math.ceil(diffDias),\n    total_dias_api:          diasAPI.length,\n    total_blocos_validos:    todosBlocos.length\n  }\n};\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        128,
        48
      ],
      "id": "1f8fb4ac-815c-4d4c-9c22-240966916bc1",
      "name": "Logica Inteligente"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify($json) }}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        352,
        48
      ],
      "id": "3f0946e2-8313-4288-8c7b-67c43cf2b26e",
      "name": "Resp: Disponibilidade"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "consulta_disponibilidade"
            },
            {
              "fieldId": "status",
              "fieldValue": "sucesso"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "=Solicitado: {{ $('Configuracao Unidades').first().json.data_inicio }}"
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        576,
        48
      ],
      "id": "98c548dd-9088-4724-a0ee-6d030e238e85",
      "name": "LOG Disponibilidade",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/appointment/get_avaliable_times_calendar",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            },
            {
              "name": "code_link",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.link_agenda }}"
            },
            {
              "name": "date",
              "value": "={{ $json.data_agendada }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        -96,
        336
      ],
      "id": "d450ecfa-1537-485d-9f11-1243497957e5",
      "name": "Verificar Agenda Agendar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "// ── Validar Slot Agendar —  ─────────────────────────\nlet d = {};\ntry { d = $('Configuracao Unidades').first().json; } catch(e) { d = $input.item.json; }\n\nconst PROF_ID   = String(d.config_agenda?.profissional?.id || '');\nconst PROF_NOME = d.config_agenda?.profissional?.nome || 'Profissional';\n\nconst inputItems    = $input.all().map(i => i.json);\nconst isNovoFormato = inputItems.length > 0 && Array.isArray(inputItems[0].AvaliableTimes);\n\nlet slots = [];\nif (isNovoFormato) {\n  slots = (inputItems[0].AvaliableTimes || []).filter(s => s.isSelectable !== false);\n} else {\n  slots = inputItems;\n}\n\nconst norm = h => {\n  if (!h) return '';\n  const p = h.toString().split(':');\n  return p[0].padStart(2,'0') + ':' + (p[1]||'00').padStart(2,'00');\n};\n\nconst hAlvo = norm(d.horario_agendado || '');\n\nfunction temSlot() {\n  return slots.some(s => {\n    const id   = String(isNovoFormato ? s.professionalId : s.ProfessionalId);\n    const from = norm(isNovoFormato ? s.from : s.From);\n    return id === PROF_ID && from === hAlvo;\n  });\n}\n\nlet v = { aprovado: false, motivo: 'Horário indisponível.' };\nlet idF = null, nomeF = '';\n\nif (!slots.length) {\n  v.motivo = 'Não há agenda aberta ou horários disponíveis neste dia.';\n} else if (!hAlvo) {\n  v.motivo = 'Horário solicitado não informado.';\n} else if (temSlot()) {\n  v = { aprovado: true, motivo: 'Horário disponível.' };\n  idF = PROF_ID; nomeF = PROF_NOME;\n} else {\n  v.motivo = `O horário ${d.horario_agendado} não está disponível.`;\n}\n\nreturn {\n  json: {\n    ...d,\n    validacao:               v,\n    id_profissional_final:   idF,\n    nome_profissional_final: nomeF,\n    hora_buscada:            hAlvo,\n    slots_encontrados_total: slots.length\n  }\n};\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        128,
        336
      ],
      "id": "a7d795f1-c8ad-46e9-8b09-c45be6a15818",
      "name": "Validar Slot Agendar"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
            "leftValue": "",
            "caseSensitive": true,
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "c0",
              "leftValue": "={{ $json.validacao.aprovado }}",
              "rightValue": "",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        352,
        336
      ],
      "id": "0d5dd045-2393-40fa-9eaa-6021ef91b99b",
      "name": "Slot Valido?"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Não foi possível confirmar o agendamento para {{ $json.data_agendada }} às {{ $json.horario_agendado }}. Motivo: {{ $json.validacao.motivo }}. Escolha outro horário.\",\n  \"status\": \"erro_validacao\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        576,
        432
      ],
      "id": "9651275b-62aa-4f8a-868c-e1f1bf9461c9",
      "name": "Resp: Erro ao Agendar"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "agendamento_falhou"
            },
            {
              "fieldId": "status",
              "fieldValue": "falha_agendamento"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "={{ $('Validar Slot Agendar').first().json.validacao.motivo }}"
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        800,
        432
      ],
      "id": "7a697703-2090-4895-a5ef-aad484a3f1dd",
      "name": "LOG Erro Agendar",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/patient/get",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            },
            {
              "name": "Name",
              "value": "={{ $('Validar Slot Agendar').item.json.nome_paciente }}"
            },
            {
              "name": "Phone",
              "value": "={{ $('Validar Slot Agendar').item.json.telefone_limpo }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        576,
        240
      ],
      "id": "f1399aac-a111-401a-859f-625628cfb30e",
      "name": "Buscar Paciente Agendar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
            "leftValue": "",
            "caseSensitive": true,
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "c0",
              "leftValue": "={{ $json.PatientId }}",
              "rightValue": "",
              "operator": {
                "type": "number",
                "operation": "exists",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        800,
        240
      ],
      "id": "6a06b745-df75-4bd5-bdf3-0ad26ed0a612",
      "name": "Paciente Existe?"
    },
    {
      "parameters": {
        "jsCode": "let idFinal = null;\n\n// Tentar pegar ID do paciente recém-criado\ntry {\n  const novo = $('Criar Novo Paciente1').all();\n  if (novo.length > 0) {\n    idFinal = novo[0].json.id || novo[0].json.PatientId || novo[0].json.personId || null;\n  }\n} catch(e) {}\n\n// Se não veio do novo, pega do paciente já existente\nif (!idFinal) {\n  try {\n    const exist = $('Buscar Paciente Agendar').all();\n    if (exist.length > 0) {\n      idFinal = exist[0].json.id || exist[0].json.PatientId || exist[0].json.personId || null;\n    }\n  } catch(e) {}\n}\n\nconst base = $('Validar Slot Agendar').first().json;\n\n// Monta data+hora ISO com fuso Brasil (idFinal já definido acima)\nconst dataISO = DateTime.fromFormat(\n  base.data_agendada + ' ' + base.horario_agendado,\n  'yyyy-MM-dd HH:mm',\n  { zone: 'America/Sao_Paulo' }\n).toISO();\n\nreturn { json: { ...base, id_paciente_final: idFinal, data_agendada_iso: dataISO } };\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1328,
        224
      ],
      "id": "b9af525b-4e7d-4179-8c28-27bec1261471",
      "name": "Unificar ID Paciente"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.clinicorp.com/rest/v1/appointment/create_appointment_by_api",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Basic eWFtYXI6NTEzYjgxOWEtZmE5Ni00YzQwLTk0ZGEtMGUyZmYwOGE2NTEx"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"Clinic_BusinessId\": {{ $json.config_agenda.business_id }},\n  \"Patient_PersonId\": {{ $json.id_paciente_final }},\n  \"Dentist_PersonId\": {{ $json.id_profissional_final }},\n  \"PatientName\": \"{{ $('Configuracao Unidades').first().json.nome_paciente }}\",\n  \"MobilePhone\": \"{{ $('Buscar Paciente Agendar').first().json.Phone }}\",\n  \"date\": \"{{ $json.data_agendada_iso }}\",\n  \"fromTime\": \"{{ $json.horario_agendado }}\",\n  \"toTime\": \"{{ DateTime.fromFormat($json.horario_agendado, 'HH:mm').plus({ minutes: 45  }).toFormat('HH:mm') }}\",\n  \"Notes\": \"Agendamento realizado via IA (Yamar)\",\n  \"CategoryColor\": \"#FF5733\",\n  \"CategoryDescription\": \"Avaliação\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        1552,
        224
      ],
      "id": "0bcce599-0179-425b-b4be-f21f5ab97556",
      "name": "Agendar Na Clinicorp"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Agendamento confirmado! ✅\\n\\n🗓️ Data: {{ $('Configuracao Unidades').first().json.data_agendada }}\\n⏰ Horário: {{ $('Configuracao Unidades').first().json.horario_agendado }}\\n📍 Unidade: {{ $('Configuracao Unidades').first().json.config_agenda.nome_loja }}\\n\\nPosso ajudar em algo mais?\",\n  \"status\": \"sucesso\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        1776,
        224
      ],
      "id": "23cbb556-b469-441d-b827-5d5e352ccb64",
      "name": "Resp: Sucesso Agendamento"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "agendamento_realizado"
            },
            {
              "fieldId": "status",
              "fieldValue": "sucesso"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "=Data: {{ $('Configuracao Unidades').first().json.data_agendada }} - Hora: {{ $('Configuracao Unidades').first().json.horario_agendado }}"
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        2000,
        224
      ],
      "id": "a68087f6-315b-43a0-83af-e67093852385",
      "name": "LOG Sucesso Agendamento",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
            "leftValue": "",
            "caseSensitive": true,
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "c0",
              "leftValue": "={{ $json.agendamento_encontrado }}",
              "rightValue": "",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        576,
        720
      ],
      "id": "fcf482be-3387-49a7-bd2d-3f990c1fc10c",
      "name": "Achou Para Cancelar?"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Agendamento cancelado com sucesso! ✅\\nData: {{ $('Configuracao Unidades').first().json.data_agendada }}\\nHorário: {{ $('Configuracao Unidades').first().json.horario_agendado }}\",\n  \"status\": \"sucesso\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        1024,
        624
      ],
      "id": "5c03e31f-7aaf-4b3f-a322-197999afff66",
      "name": "Resp: Cancelamento Feito"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "cancelamento_realizado"
            },
            {
              "fieldId": "status",
              "fieldValue": "sucesso"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "Cancelado pelo paciente via IA"
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1248,
        624
      ],
      "id": "c4d2d09f-69d3-41b4-8230-208da61bbe81",
      "name": "LOG Sucesso Cancelamento",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Não encontrei agendamento para {{ $('Configuracao Unidades').first().json.data_agendada }} às {{ $('Configuracao Unidades').first().json.horario_agendado }}. Poderia confirmar a data?\",\n  \"status\": \"nao_encontrado\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        800,
        816
      ],
      "id": "61d26539-383a-4c2e-bc63-235080300ca4",
      "name": "Resp: Agmt Nao Encontrado Cancelar"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "tentativa_cancelamento"
            },
            {
              "fieldId": "status",
              "fieldValue": "evento_nao_encontrado"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "Paciente tentou cancelar data inexistente"
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1024,
        816
      ],
      "id": "b88c4c4d-989a-4bcd-acb5-583bf2bda711",
      "name": "LOG Erro Cancelar",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
            "leftValue": "",
            "caseSensitive": true,
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "c0",
              "leftValue": "={{ $json.agendamento_encontrado }}",
              "rightValue": "",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        576,
        1104
      ],
      "id": "1915db48-eb31-487f-b981-fe91f0b48894",
      "name": "Achou o Antigo?"
    },
    {
      "parameters": {
        "jsCode": "// ── Validar Slot Remarcar — Yamar  ────────────────────────\nlet d = {};\ntry { d = $('Configuracao Unidades').first().json; } catch(e) { d = $input.item.json; }\n\nconst PROF_ID   = String(d.config_agenda?.profissional?.id || '');\nconst PROF_NOME = d.config_agenda?.profissional?.nome || 'Profissional';\n\nconst inputItems    = $input.all().map(i => i.json);\nconst isNovoFormato = inputItems.length > 0 && Array.isArray(inputItems[0].AvaliableTimes);\n\nlet slots = [];\nif (isNovoFormato) {\n  slots = (inputItems[0].AvaliableTimes || []).filter(s => s.isSelectable !== false);\n} else {\n  slots = inputItems;\n}\n\nconst norm = h => {\n  if (!h) return '';\n  const p = h.toString().split(':');\n  return p[0].padStart(2,'0') + ':' + (p[1]||'00').padStart(2,'00');\n};\n\nconst hAlvo = norm(d.horario_agendado || '');\n\nfunction temSlot() {\n  return slots.some(s => {\n    const id   = String(isNovoFormato ? s.professionalId : s.ProfessionalId);\n    const from = norm(isNovoFormato ? s.from : s.From);\n    return id === PROF_ID && from === hAlvo;\n  });\n}\n\nlet v = { aprovado: false, motivo: 'Horário indisponível.' };\nlet idF = null, nomeF = '';\n\nif (!slots.length) {\n  v.motivo = 'Não há agenda aberta ou horários disponíveis neste dia.';\n} else if (!hAlvo) {\n  v.motivo = 'Horário solicitado não informado.';\n} else if (temSlot()) {\n  v = { aprovado: true, motivo: 'Horário disponível.' };\n  idF = PROF_ID; nomeF = PROF_NOME;\n} else {\n  v.motivo = `O horário ${d.horario_agendado} não está disponível.`;\n}\n\n// Recupera dados dos nós anteriores\nlet patientIdRemarcar = null;\ntry { patientIdRemarcar = $('Buscar Paciente Remarcar1').first().json.PatientId; } catch(e) {}\n\nlet agendamentoIdAntigo = null;\ntry { agendamentoIdAntigo = $('Filtrar Agmt Antigo1').first().json.agendamento_id_antigo; } catch(e) {}\n\n// Monta ISO da nova data+hora com fuso Brasil\nconst dataISO = DateTime.fromFormat(\n  d.data_agendada + ' ' + d.horario_agendado,\n  'yyyy-MM-dd HH:mm',\n  { zone: 'America/Sao_Paulo' }\n).toISO();\n\nreturn {\n  json: {\n    ...d,\n    validacao:               v,\n    id_profissional_final:   idF,\n    nome_profissional_final: nomeF,\n    hora_buscada:            hAlvo,\n    slots_encontrados_total: slots.length,\n    patient_id_remarcar:     patientIdRemarcar,\n    agendamento_id_antigo:   agendamentoIdAntigo,\n    data_agendada_iso:       dataISO\n  }\n};\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1024,
        1008
      ],
      "id": "567b8ca4-6428-4a12-a74e-50a9d0d5df19",
      "name": "Validar Slot Remarcar"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
            "leftValue": "",
            "caseSensitive": true,
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "c0",
              "leftValue": "={{ $json.validacao.aprovado }}",
              "rightValue": "",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        1248,
        1008
      ],
      "id": "f844b3e6-968f-4826-aaa5-442a063d5a4c",
      "name": "Novo Horario Valido?"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Agendamento remarcado com sucesso! 🔄\\n\\nEra: {{ $('Filtrar Agmt Antigo1').first().json.data_hora_antiga }}\\nFicou para: {{ $('Configuracao Unidades').first().json.data_agendada }} às {{ $('Configuracao Unidades').first().json.horario_agendado }}\",\n  \"status\": \"sucesso\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        2144,
        720
      ],
      "id": "0c0ad5e2-9d6f-4c2e-986b-498f4e4ea77f",
      "name": "Resp: Remarcado Sucesso"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "remarcacao_realizada"
            },
            {
              "fieldId": "status",
              "fieldValue": "sucesso"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "=Trocou de {{ $('Filtrar Agmt Antigo1').first().json.data_hora_antiga }} PARA {{ $('Configuracao Unidades').first().json.data_agendada }} {{ $('Configuracao Unidades').first().json.horario_agendado }}"
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        2368,
        720
      ],
      "id": "7c293c7f-7256-44dd-b3e2-2d8496861ef2",
      "name": "LOG Sucesso Remarcacao",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Não encontrei agendamento no dia {{ DateTime.fromISO($('Configuracao Unidades').first().json.data_antiga_iso).toFormat('dd/MM') }} para remarcar. Poderia confirmar a data atual?\",\n  \"status\": \"agendamento_nao_encontrado\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        800,
        1200
      ],
      "id": "5f1ab587-da6d-458b-80d0-5111ea78b67f",
      "name": "Resp: Antigo Nao Encontrado"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "tentativa_remarcacao"
            },
            {
              "fieldId": "status",
              "fieldValue": "erro_busca_antigo"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "=Paciente tentou alterar {{ $('Configuracao Unidades').first().json.data_antiga_iso }} mas não existia."
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1024,
        1200
      ],
      "id": "0e0f1f17-aeb0-4d34-b2bb-936b0b0f84ab",
      "name": "LOG Erro Busca Antigo",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Encontrei seu agendamento atual, mas não consegui mudar para o novo horário. Motivo: {{ $json.validacao.motivo }}.\",\n  \"status\": \"erro_validacao_novo\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        1472,
        1104
      ],
      "id": "0354829b-3da3-479b-9541-a3384b5f5441",
      "name": "Resp: Novo Horario Invalido"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "tentativa_remarcacao"
            },
            {
              "fieldId": "status",
              "fieldValue": "erro_novo_horario_invalido"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "={{ $json.validacao.motivo }}"
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1696,
        1104
      ],
      "id": "3713e7c5-7775-4614-840e-ed9f89702551",
      "name": "LOG Erro Novo Horario",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
            "leftValue": "",
            "caseSensitive": true,
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "c0",
              "leftValue": "={{ $json.proximo_encontrado }}",
              "rightValue": "",
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        576,
        1488
      ],
      "id": "cf6f6123-5b21-428d-91ad-65aeebf6e94c",
      "name": "Encontrou Proximo?"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Sim! ✅ Encontrei seu agendamento para {{ $json.proximo_data }} às {{ $json.proximo_hora }} na {{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}.\",\n  \"status\": \"encontrado\",\n  \"data_agendamento\": \"{{ $json.proximo_data }}\",\n  \"hora_agendamento\": \"{{ $json.proximo_hora }}\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        800,
        1392
      ],
      "id": "0570651f-7b64-4f5f-a3b0-5cf1778edc96",
      "name": "Resp: Agmt Encontrado"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "verificacao_agenda_paciente"
            },
            {
              "fieldId": "status",
              "fieldValue": "encontrado"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "=Paciente consultou: {{ $json.proximo_data }} {{ $json.proximo_hora }}"
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1024,
        1392
      ],
      "id": "0da6d26d-7535-4e8f-8027-e231049db5fd",
      "name": "LOG Verificar Encontrado",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Não encontrei agendamento futuro na {{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}. 🤔 Vamos agendar sua avaliação?\",\n  \"status\": \"nao_encontrado\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        800,
        1584
      ],
      "id": "8deaed1c-d28b-45eb-b62e-df81b71e819b",
      "name": "Resp: Agmt Nao Encontrado"
    },
    {
      "parameters": {
        "tableId": "metricas_ia",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "clinica",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_empresa }}"
            },
            {
              "fieldId": "unidade",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}"
            },
            {
              "fieldId": "acao",
              "fieldValue": "verificacao_agenda_paciente"
            },
            {
              "fieldId": "status",
              "fieldValue": "nao_encontrado"
            },
            {
              "fieldId": "telefone_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            },
            {
              "fieldId": "detalhes",
              "fieldValue": "Paciente não tem avaliação marcada."
            },
            {
              "fieldId": "nome_paciente",
              "fieldValue": "={{ $('Configuracao Unidades').first().json.nome_paciente }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1024,
        1584
      ],
      "id": "49e4c948-2a71-47fb-bcc2-4b8293097d55",
      "name": "LOG Verificar Nao Encontrado",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/appointment/list",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            },
            {
              "name": "from",
              "value": "={{ DateTime.fromISO($('Configuracao Unidades').item.json.data_antiga).minus({ days: 1 }).toFormat('yyyy-MM-dd') }}"
            },
            {
              "name": "to",
              "value": "={{ DateTime.fromISO($('Configuracao Unidades').item.json.data_antiga).plus({ days: 1 }).toFormat('yyyy-MM-dd') }}"
            },
            {
              "name": "businessId",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.business_id }}"
            },
            {
              "name": "patientId",
              "value": "={{ $json.PatientId }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        128,
        1104
      ],
      "id": "77696305-6df3-49f5-977a-d2778aca08a9",
      "name": "Listar Agmts Remarcar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "// ── Recuperar Reagendamento — Yamar ──────────────────────\nconst base = $('Validar Slot Remarcar').first().json;\nconst dur  = base.config_agenda?.duracao_servico || 45;\n\n// ISO da nova data+hora com fuso Brasil\nconst dataISO = DateTime.fromFormat(\n  base.data_agendada + ' ' + base.horario_agendado,\n  'yyyy-MM-dd HH:mm',\n  { zone: 'America/Sao_Paulo' }\n).toISO();\n\n// toTime pré-calculado\nconst toTime = DateTime.fromFormat(base.horario_agendado, 'HH:mm')\n  .plus({ minutes: dur })\n  .toFormat('HH:mm');\n\nreturn {\n  json: {\n    ...base,\n    id_paciente_final: base.patient_id_remarcar,  // já vem do Validar Slot Remarcar\n    data_agendada_iso: dataISO,\n    toTime_calculado:  toTime\n  }\n};\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1696,
        720
      ],
      "id": "ee0b6976-7571-4a5e-a29f-d061d090a03e",
      "name": "Recuperar Reagendamento"
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/appointment/list",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            },
            {
              "name": "from",
              "value": "={{ DateTime.fromISO($('Configuracao Unidades').item.json.data_agendada).toFormat('yyyy-MM-dd') }}"
            },
            {
              "name": "to",
              "value": "={{ DateTime.fromISO($('Configuracao Unidades').item.json.data_agendada).toFormat('yyyy-MM-dd') }}"
            },
            {
              "name": "businessId",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.business_id }}"
            },
            {
              "name": "patientId",
              "value": "={{ $json.PatientId }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        128,
        1488
      ],
      "id": "9873ce8c-0c08-4575-ba43-561b2c74f608",
      "name": "Listar Agmts Verficiar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.clinicorp.com/rest/v1/patient/create",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Basic eWFtYXI6NTEzYjgxOWEtZmE5Ni00YzQwLTk0ZGEtMGUyZmYwOGE2NTEx"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"subscriber_id\": \"{{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}\",\n  \"Name\": \"{{ $('Configuracao Unidades').first().json.nome_paciente }}\",\n  \"MobilePhone\": \"{{ $('Configuracao Unidades').first().json.telefone_limpo }}\",\n  \"Notes\": \"Paciente cadastrado via IA (Yamar)\"\n}\n",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        1024,
        336
      ],
      "id": "dacf942d-99b4-4f63-8c2f-73cfdb297652",
      "name": "Criar Novo Paciente1"
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/patient/get",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            },
            {
              "name": "Phone",
              "value": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        -96,
        720
      ],
      "id": "f37e4495-6673-4acf-bc22-404cfa8ff798",
      "name": "Buscar Paciente Cancelar1",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/appointment/list",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            },
            {
              "name": "from",
              "value": "={{ DateTime.fromISO($('Configuracao Unidades').item.json.data_agendada).minus({ days: 1 }).toFormat('yyyy-MM-dd') }}"
            },
            {
              "name": "to",
              "value": "={{ DateTime.fromISO($('Configuracao Unidades').item.json.data_agendada).plus({ days: 1 }).toFormat('yyyy-MM-dd') }}"
            },
            {
              "name": "businessId",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.business_id }}"
            },
            {
              "name": "patientId",
              "value": "={{ $json.PatientId }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        128,
        720
      ],
      "id": "322dc8a2-71ea-483c-90f3-d691a996c36b",
      "name": "Listar Agmts Cancelar1",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "const config   = $('Configuracao Unidades').first().json;\nconst horaAlvo = config.horario_agendado;\nconst agmts    = $input.all().map(i=>i.json);\n\nconst norm = h => {\n  if(!h) return '';\n  const p=h.toString().split(':');\n  return p[0].padStart(2,'0')+':'+(p[1]||'00').padStart(2,'0');\n};\n\nlet enc = null;\nfor(const a of agmts){\n  if(a.Deleted!=='X' && norm(a.fromTime)===norm(horaAlvo)){ enc=a; break; }\n}\n\nreturn { json: { ...config, agendamento_id: enc?enc.id:null, agendamento_encontrado:!!enc, dados_agendamento:enc||null } };\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        352,
        720
      ],
      "id": "4b5ff459-ad80-4bd7-938a-ecfb3d8c2ba0",
      "name": "Filtrar Agmt Cancelar1"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.clinicorp.com/rest/v1/appointment/cancel_appointment",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.authorization }}"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"subscriber_id\": \"{{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}\",\n  \"id\": {{ $json.agendamento_id }}\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        800,
        624
      ],
      "id": "e823cf39-4b09-43a7-82bd-c35e6871829f",
      "name": "Cancelar Na Clinicorp1"
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/patient/get",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            },
            {
              "name": "Phone",
              "value": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        -96,
        1104
      ],
      "id": "93e5f468-1f91-409d-97ed-9eedeb5b0906",
      "name": "Buscar Paciente Remarcar1",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "const config = $('Configuracao Unidades').first().json;\nconst agmts  = $input.all().map(i => i.json);\nlet enc = null;\nfor (const a of agmts) {\n  if (a.id && a.Deleted !== 'X') { enc = a; break; }  // ← adicionado: a.id\n}\nreturn { json: { ...config,\n  agendamento_id_antigo:    enc ? enc.id : null,\n  agendamento_encontrado:   !!enc,\n  dados_agendamento_antigo: enc || null,\n  data_hora_antiga:         enc ? (enc.AppointmentDate + ' ' + enc.fromTime) : null\n} };\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        352,
        1104
      ],
      "id": "3b9f3432-8680-4f45-9d6d-7f9c56a96eb5",
      "name": "Filtrar Agmt Antigo1"
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/appointment/get_avaliable_times_calendar",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpBasicAuth",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            },
            {
              "name": "code_link",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.link_agenda }}"
            },
            {
              "name": "date",
              "value": "={{ $json.data_agendada }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        800,
        1008
      ],
      "id": "78048f14-5248-46f6-b499-030c1a08a6b8",
      "name": "Verificar Slots Remarcar1",
      "alwaysOutputData": true,
      "credentials": {
        "httpBasicAuth": {
          "id": "lvyY4VScpaMllNMM",
          "name": "Relatório Gabriel - Contact.ia (Não mexer)"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const config = $('Configuracao Unidades').first().json;\nconst agmts  = $input.all().map(i => i.json);\nlet prox = null;\n\nfor (const a of agmts) {\n  if (a.id && a.Deleted !== 'X') { prox = a; break; }  // a.id evita falso positivo do alwaysOutputData\n}\n\nreturn { json: { ...config,\n  proximo_encontrado: !!prox,\n  proximo_data:       prox ? prox.AppointmentDate : null,\n  proximo_hora:       prox ? prox.fromTime : null,\n  proximo_id:         prox ? prox.id : null,\n  dados_proximo:      prox || null\n} };\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        352,
        1488
      ],
      "id": "fba68691-7c75-4835-976e-024df7af4e0a",
      "name": "Filtrar Proximo Agmt1"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.clinicorp.com/rest/v1/appointment/cancel_appointment",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Basic eWFtYXI6NTEzYjgxOWEtZmE5Ni00YzQwLTk0ZGEtMGUyZmYwOGE2NTEx"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"subscriber_id\": \"{{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}\",\n  \"id\": {{ $json.agendamento_id_antigo }}\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        1472,
        720
      ],
      "id": "d2db85a7-5f20-4aa5-85e9-365cb8eb6945",
      "name": "Cancelar Antigo Remarcar1"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.clinicorp.com/rest/v1/appointment/create_appointment_by_api",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Basic eWFtYXI6NTEzYjgxOWEtZmE5Ni00YzQwLTk0ZGEtMGUyZmYwOGE2NTEx"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"Clinic_BusinessId\": {{ $json.config_agenda.business_id }},\n  \"Patient_PersonId\": {{ $json.id_paciente_final }},\n  \"Dentist_PersonId\": {{ $json.id_profissional_final }},\n  \"PatientName\": \"{{ $('Configuracao Unidades').first().json.nome_paciente }}\",\n  \"MobilePhone\": \"{{ $('Configuracao Unidades').first().json.telefone_limpo }}\",\n  \"date\": \"{{ $json.data_agendada_iso }}\",\n  \"fromTime\": \"{{ $json.horario_agendado }}\",\n  \"toTime\": \"{{ DateTime.fromFormat($json.horario_agendado, 'HH:mm').plus({ minutes: 45 }).toFormat('HH:mm') }}\",\n  \"Notes\": \"Reagendamento realizado via IA (Yamar)\",\n  \"CategoryColor\": \"#FF5733\",\n  \"CategoryDescription\": \"Avaliação\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        1920,
        720
      ],
      "id": "70f7e6a1-8c10-41ce-b98b-82be6f154858",
      "name": "Reagendar Clinicorp1"
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/patient/get",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "subscriber_id",
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}"
            },
            {
              "name": "Phone",
              "value": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "={{ $('Configuracao Unidades').item.json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        -96,
        1488
      ],
      "id": "f1515601-5dd6-436d-898f-bec56f7429c8",
      "name": "Buscar Paciente Verificar1",
      "alwaysOutputData": true
    }
  ],
  "connections": {
    "INICIO": {
      "main": [
        [
          {
            "node": "Configuracao Unidades",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Configuracao Unidades": {
      "main": [
        [
          {
            "node": "Guarda de Transito",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Guarda de Transito": {
      "main": [
        [
          {
            "node": "Verificar Agenda Disponibilidade",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Verificar Agenda Agendar",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Buscar Paciente Cancelar1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Buscar Paciente Remarcar1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Buscar Paciente Verificar1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Verificar Agenda Disponibilidade": {
      "main": [
        [
          {
            "node": "Logica Inteligente",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Logica Inteligente": {
      "main": [
        [
          {
            "node": "Resp: Disponibilidade",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Disponibilidade": {
      "main": [
        [
          {
            "node": "LOG Disponibilidade",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Verificar Agenda Agendar": {
      "main": [
        [
          {
            "node": "Validar Slot Agendar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Validar Slot Agendar": {
      "main": [
        [
          {
            "node": "Slot Valido?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Slot Valido?": {
      "main": [
        [
          {
            "node": "Buscar Paciente Agendar",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Resp: Erro ao Agendar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Erro ao Agendar": {
      "main": [
        [
          {
            "node": "LOG Erro Agendar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Paciente Agendar": {
      "main": [
        [
          {
            "node": "Paciente Existe?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Paciente Existe?": {
      "main": [
        [
          {
            "node": "Unificar ID Paciente",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Criar Novo Paciente1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Unificar ID Paciente": {
      "main": [
        [
          {
            "node": "Agendar Na Clinicorp",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Agendar Na Clinicorp": {
      "main": [
        [
          {
            "node": "Resp: Sucesso Agendamento",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Sucesso Agendamento": {
      "main": [
        [
          {
            "node": "LOG Sucesso Agendamento",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Achou Para Cancelar?": {
      "main": [
        [
          {
            "node": "Cancelar Na Clinicorp1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Resp: Agmt Nao Encontrado Cancelar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Cancelamento Feito": {
      "main": [
        [
          {
            "node": "LOG Sucesso Cancelamento",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Agmt Nao Encontrado Cancelar": {
      "main": [
        [
          {
            "node": "LOG Erro Cancelar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Achou o Antigo?": {
      "main": [
        [
          {
            "node": "Verificar Slots Remarcar1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Resp: Antigo Nao Encontrado",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Validar Slot Remarcar": {
      "main": [
        [
          {
            "node": "Novo Horario Valido?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Novo Horario Valido?": {
      "main": [
        [
          {
            "node": "Cancelar Antigo Remarcar1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Resp: Novo Horario Invalido",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Remarcado Sucesso": {
      "main": [
        [
          {
            "node": "LOG Sucesso Remarcacao",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Antigo Nao Encontrado": {
      "main": [
        [
          {
            "node": "LOG Erro Busca Antigo",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Novo Horario Invalido": {
      "main": [
        [
          {
            "node": "LOG Erro Novo Horario",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Encontrou Proximo?": {
      "main": [
        [
          {
            "node": "Resp: Agmt Encontrado",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Resp: Agmt Nao Encontrado",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Agmt Encontrado": {
      "main": [
        [
          {
            "node": "LOG Verificar Encontrado",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Agmt Nao Encontrado": {
      "main": [
        [
          {
            "node": "LOG Verificar Nao Encontrado",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Listar Agmts Remarcar": {
      "main": [
        [
          {
            "node": "Filtrar Agmt Antigo1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Recuperar Reagendamento": {
      "main": [
        [
          {
            "node": "Reagendar Clinicorp1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Listar Agmts Verficiar": {
      "main": [
        [
          {
            "node": "Filtrar Proximo Agmt1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Criar Novo Paciente1": {
      "main": [
        [
          {
            "node": "Unificar ID Paciente",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Paciente Cancelar1": {
      "main": [
        [
          {
            "node": "Listar Agmts Cancelar1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Listar Agmts Cancelar1": {
      "main": [
        [
          {
            "node": "Filtrar Agmt Cancelar1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filtrar Agmt Cancelar1": {
      "main": [
        [
          {
            "node": "Achou Para Cancelar?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Cancelar Na Clinicorp1": {
      "main": [
        [
          {
            "node": "Resp: Cancelamento Feito",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Paciente Remarcar1": {
      "main": [
        [
          {
            "node": "Listar Agmts Remarcar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filtrar Agmt Antigo1": {
      "main": [
        [
          {
            "node": "Achou o Antigo?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Verificar Slots Remarcar1": {
      "main": [
        [
          {
            "node": "Validar Slot Remarcar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filtrar Proximo Agmt1": {
      "main": [
        [
          {
            "node": "Encontrou Proximo?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Cancelar Antigo Remarcar1": {
      "main": [
        [
          {
            "node": "Recuperar Reagendamento",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Reagendar Clinicorp1": {
      "main": [
        [
          {
            "node": "Resp: Remarcado Sucesso",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Paciente Verificar1": {
      "main": [
        [
          {
            "node": "Listar Agmts Verficiar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {
    "INICIO": [
      {
        "headers": {
          "host": "webhook.dentistapower.com.br",
          "content-length": "186",
          "content-type": "application/json; charset=utf-8",
          "traceparent": "00-bee8df546459cbdbe6ec7c3032cf351e-643bea58056fae52-00",
          "tracestate": "@nr=0-0---643bea58056fae52-d7dd2f5e21ca3835-0-0.181598-1775463155739",
          "x-forwarded-for": "18.215.79.89",
          "x-forwarded-host": "webhook.dentistapower.com.br",
          "x-forwarded-port": "443",
          "x-forwarded-proto": "https",
          "x-forwarded-server": "7b7aec13661d",
          "x-real-ip": "18.215.79.89",
          "accept-encoding": "gzip"
        },
        "params": {},
        "query": {},
        "body": {
          "action": "verificar_disponibilidade",
          "data_agendada": "2026-04-06T09:00:00",
          "nome_cliente": "Giovana Maiara",
          "telefone_cliente": "5543996960359",
          "insistiu": "False"
        },
        "webhookUrl": "https://webhook.dentistapower.com.br/webhook/AGENDAMENTOS_YAMAR",
        "executionMode": "production"
      }
    ]
  },
  "meta": {
    "instanceId": "d1a2ea4f12ae9ebd3132590ec74e61784d3b49e17967bcb70d511f83551a7c49"
  }
}