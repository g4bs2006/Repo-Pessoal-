{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "agendamentos-obclinic",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        -608,
        784
      ],
      "id": "a08c7c0d-8b44-47d6-8922-17f3fac735dd",
      "name": "INICIO",
      "webhookId": "obclinic-wh-001"
    },
    {
      "parameters": {
        "jsCode": "// --- CONFIGURAÇÃO MESTRE: Oral Bem Joinville ---\nconst body = $input.item.json.body || $input.item.json;\nconst telefoneRaw = body.telefone_cliente || body.telefone_contato || body.telefone || '';\nconst telefoneLimpo = telefoneRaw.toString().replace(/\\D/g, '');\nconst nomePaciente = body.nome_cliente || body.nome_contato || 'Paciente';\nconst insistiu = body.insistiu === true || body.insistiu === 'true';\nconst horarioPreferido = (body.horario_preferido || '').trim();\nconst isPeriodo = /manh[aã]|tarde/i.test(horarioPreferido);\nconst periodoPreferencia = isPeriodo ? (/tarde/i.test(horarioPreferido) ? 'tarde' : 'manha') : '';\nconst TIMEZONE = 'America/Sao_Paulo';\n\nconst unidadeChave = 'oralbemjoinville';\n\nconst CONFIGS = {\n  oralbemjoinville: {\n    subscriber_id:            'oralbemjoinville',\n    business_id:              '4837083882979328',\n    nome_unidade:             'OBClinic',\n    nome_empresa:             'OBClinic',\n    link_agenda:              '769456',\n    duracao_servico:          45,\n    capacidade_simultanea:    2,\n    timezone:                 TIMEZONE,\n    limite_dias_busca_normal: 7,\n    profissional:          { id: '6619432407662592', nome: 'Dr. Valter Semiano Vavassori' },\n    profissional_fallback: { id: '5707738089127936', nome: 'Dra. Eduarda Rodrigues' },\n    authorization: 'Basic ' + Buffer.from('oralbemjoinville:e7b8596d-8efe-4de6-ab5b-c0dfcd32b9b3').toString('base64')\n  }\n};\n\nconst CONFIG = CONFIGS[unidadeChave];\n\nconst hoje       = DateTime.now().setZone(TIMEZONE);\nconst dataInicio = hoje.toFormat('yyyy-MM-dd');\n\nconst dataRaw = body.data_iso || body.data_inicio || body.data_agendada || '';\nlet dtP = null;\n\nif (dataRaw) {\n  dtP = DateTime.fromISO(dataRaw, { zone: TIMEZONE });\n  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });\n  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'dd/MM/yyyy HH:mm', { zone: TIMEZONE });\n}\n\nconst horaDoISO = (dtP && dtP.isValid && (dtP.hour > 0 || dtP.minute > 0))\n  ? dtP.toFormat('HH:mm') : '';\n\nconst horaEspecifica = !isPeriodo && horarioPreferido.includes(':') ? horarioPreferido : '';\nconst horaFinal = horaEspecifica\n  || ((body.horario_agendado && body.horario_agendado.length >= 4) ? body.horario_agendado : '')\n  || ((body.horario && body.horario.length >= 4) ? body.horario : '')\n  || horaDoISO;\n\nconst dataFinal = (dtP && dtP.isValid) ? dtP.toFormat('yyyy-MM-dd') : '';\nconst dataFim   = (dtP && dtP.isValid)\n  ? dtP.plus({ days: 7 }).toFormat('yyyy-MM-dd')\n  : hoje.plus({ days: 7 }).toFormat('yyyy-MM-dd');\n\nreturn {\n  json: {\n    acao_fluxo:        body.action || body.acao_fluxo,\n    nome_paciente:     nomePaciente,\n    telefone_limpo:    telefoneLimpo,\n    insistiu:          insistiu,\n    data_nascimento:   body.data_nascimento || '',\n    data_inicio:       dataInicio,\n    data_agendada:     dataFinal,\n    data_antiga:       body.data_antiga || body['data-antiga'] || '',\n    data_fim:          dataFim,\n    horario_agendado:  horaFinal,\n    horario_preferido:   horarioPreferido,\n    periodo_preferencia: periodoPreferencia,\n    config_agenda: {\n      subscriber_id:            CONFIG.subscriber_id,\n      business_id:              CONFIG.business_id,\n      nome_unidade:             CONFIG.nome_unidade,\n      nome_empresa:             CONFIG.nome_empresa,\n      link_agenda:              CONFIG.link_agenda,\n      duracao_servico:          CONFIG.duracao_servico,\n      capacidade_simultanea:    CONFIG.capacidade_simultanea,\n      timezone:                 CONFIG.timezone,\n      limite_dias_busca_normal: CONFIG.limite_dias_busca_normal,\n      profissional:             CONFIG.profissional,\n      profissional_fallback:    CONFIG.profissional_fallback,\n      authorization:            CONFIG.authorization\n    }\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -384,
        784
      ],
      "id": "280ed70c-fa6e-4160-8e91-bdce5ecf1251",
      "name": "Configuracao Unidades"
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 2
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
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 2
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
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 2
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
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 2
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
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict",
                  "version": 2
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
        -160,
        736
      ],
      "id": "c817fe10-7ebd-4380-b1b3-c1a20965f42e",
      "name": "Guarda de Transito"
    },
    {
      "parameters": {
        "url": "https://api.clinicorp.com/rest/v1/appointment/get_avaliable_days",
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
        64,
        112
      ],
      "id": "ef7898eb-c40a-4d92-a893-04f9448a5a38",
      "name": "Verificar Agenda Disponibilidade",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "// =============================================================\n// LÓGICA INTELIGENTE — Oral Bem Joinville\n// Principal: Dr. Valter | Fallback: Dra. Eduarda\n//\n// REGRA DE PRIORIDADE:\n//   1. DIA é prioridade. Se há qualquer slot no dia pedido,\n//      ofereço opções do mesmo dia (ordenadas por proximidade\n//      do horário pedido).\n//   2. Só pulo para outros dias se o dia pedido não tem slot algum.\n//   3. Em outros dias, ordeno cronologicamente a partir do dia\n//      pedido e, dentro de cada dia, escolho o slot mais próximo\n//      do horário pedido.\n// =============================================================\n\nconst cfgNode = $('Configuracao Unidades').first().json;\nconst ca      = cfgNode.config_agenda || {};\n\nconst TIMEZONE    = ca.timezone || 'America/Sao_Paulo';\nconst LIMITE_DIAS = ca.limite_dias_busca_normal || 7;\n\nconst PROF_PRINCIPAL = {\n  id:   String(ca.profissional?.id || ''),\n  nome: ca.profissional?.nome || 'Profissional'\n};\nconst PROF_FALLBACK = {\n  id:   String(ca.profissional_fallback?.id || ''),\n  nome: ca.profissional_fallback?.nome || ''\n};\n\nconst diasAPI  = $input.all().map(i => i.json);\nconst insistiu = cfgNode.insistiu === true;\nconst hRaw     = cfgNode.horario_agendado || '';\nconst dRaw     = cfgNode.data_agendada || '';\nconst periodoPreferencia = cfgNode.periodo_preferencia || '';  // 'manha' | 'tarde' | ''\nconst agora    = DateTime.now().setZone(TIMEZONE);\n\n// ── Helpers ────────────────────────────────────────────────────────────\nfunction horaParaMin(str) {\n  if (!str) return -1;\n  const p = str.split(':');\n  return parseInt(p[0]) * 60 + parseInt(p[1] || '0');\n}\n\nfunction fmtBloco(b) {\n  const [, mm, dd] = b.data.split('-');\n  return `\\uD83D\\uDDD3\\uFE0F *${dd}/${mm} (${b.semana})* às *${b.horario}* – *${b.horario_fim}* com ${b.profNome}`;\n}\n\n// Ordena blocos por proximidade ao horário pedido (asc) e retorna os N primeiros.\n// Se minAlvo < 0 (sem horário), retorna ordenado cronologicamente.\nfunction topNPorProximidade(blocos, minAlvo, n = 3) {\n  if (!blocos.length) return [];\n  const copia = blocos.slice();\n  if (minAlvo < 0) {\n    copia.sort((a, b) => a.minutos - b.minutos);\n  } else {\n    copia.sort((a, b) =>\n      Math.abs(a.minutos - minAlvo) - Math.abs(b.minutos - minAlvo)\n      || a.minutos - b.minutos\n    );\n  }\n  return copia.slice(0, n);\n}\n\n// Para cada dia, escolhe o slot mais próximo do horário pedido.\n// Ordena cronologicamente a partir de dataRef e retorna N dias.\nfunction topNDiasComMelhorHorario(blocos, dataRef, minAlvo, n = 3) {\n  const porDia = {};\n  for (const b of blocos) {\n    const atual = porDia[b.data];\n    if (!atual) {\n      porDia[b.data] = b;\n    } else if (minAlvo >= 0\n               && Math.abs(b.minutos - minAlvo) < Math.abs(atual.minutos - minAlvo)) {\n      porDia[b.data] = b;\n    }\n  }\n  const dias = Object.keys(porDia).sort();\n  const pool = dataRef ? dias.filter(d => d >= dataRef) : dias;\n  const escolhidos = pool.length >= n ? pool : dias;\n  return escolhidos.slice(0, n).map(d => porDia[d]);\n}\n\n// ── Processar resposta da API em blocos por profissional ──────────────\nfunction processarDia(dia) {\n  const slots     = (dia.AvaliableTimes || []).filter(s => s.isSelectable !== false);\n  const principal = [];\n  const fallback  = [];\n\n  for (const slot of slots) {\n    const sid = String(slot.professionalId);\n    const bloco = {\n      data:        dia.jsonDate,\n      semana:      dia.Week,\n      minutos:     horaParaMin(slot.from),\n      horario:     slot.from,\n      horario_fim: slot.to\n    };\n    if (sid === PROF_PRINCIPAL.id) {\n      principal.push({ ...bloco, profId: PROF_PRINCIPAL.id, profNome: PROF_PRINCIPAL.nome });\n    } else if (PROF_FALLBACK.id && sid === PROF_FALLBACK.id) {\n      fallback.push({ ...bloco, profId: PROF_FALLBACK.id, profNome: PROF_FALLBACK.nome });\n    }\n  }\n  return { principal, fallback };\n}\n\nlet blocosPrincipal = [];\nlet blocosFallback  = [];\nfor (const dia of diasAPI) {\n  const { principal, fallback } = processarDia(dia);\n  blocosPrincipal = blocosPrincipal.concat(principal);\n  blocosFallback  = blocosFallback.concat(fallback);\n}\n\nconst todosBlocos    = blocosPrincipal.concat(blocosFallback);\nconst usandoFallback = blocosPrincipal.length === 0 && blocosFallback.length > 0;\n\n// ── Parse da data/horário solicitado ──────────────────────────────────\nlet dtSolicitado = null;\nif (dRaw && hRaw) {\n  dtSolicitado = DateTime.fromFormat(`${dRaw} ${hRaw}`, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });\n}\n\nconst dataAlvo      = dtSolicitado?.isValid ? dtSolicitado.toFormat('yyyy-MM-dd') : (dRaw || null);\nconst minSolicitado = (hRaw && hRaw !== '00:00') ? horaParaMin(hRaw) : -1;\n\nconst dtLabel = dtSolicitado?.isValid\n  ? dtSolicitado.setLocale('pt-BR').toFormat('dd/MM (cccc)')\n  : (dRaw || 'data solicitada');\n\nlet diffDias = 0, bloqueado = false;\nif (dtSolicitado?.isValid) {\n  diffDias = dtSolicitado.startOf('day').diff(agora.startOf('day'), 'days').days;\n  if (diffDias > LIMITE_DIAS && !insistiu) bloqueado = true;\n}\n\n// ── Montar resposta ───────────────────────────────────────────────────\nlet resultado, exactMatch = false;\nconst sugestoesHorarios = [];\n\n// CASO PERÍODO — paciente escolheu manhã ou tarde\nif (periodoPreferencia) {\n  const faixas = {\n    manha: { inicio: 8*60,      fim: 12*60   },\n    tarde: { inicio: 13*60+30,  fim: 18*60+1 }\n  };\n  const faixa = faixas[periodoPreferencia] || faixas.manha;\n  const labelPeriodo = periodoPreferencia === 'manha' ? 'manhã' : 'tarde';\n  const labelOutro   = periodoPreferencia === 'manha' ? 'tarde' : 'manhã';\n  const dataMinima = dataAlvo || agora.toFormat('yyyy-MM-dd');\n  const blocosPeriodo = todosBlocos\n    .filter(b => b.minutos >= faixa.inicio && b.minutos < faixa.fim && b.data >= dataMinima)\n    .sort((a, b) => a.data.localeCompare(b.data) || a.minutos - b.minutos);\n  if (blocosPeriodo.length === 0) {\n    resultado = `😕 Não há horários disponíveis no período da *${labelPeriodo}* para *${dtLabel}*.\\n\\nTemos opções no período da *${labelOutro}*. Prefere que eu verifique?`;\n  } else {\n    const primeiro = blocosPeriodo[0];\n    sugestoesHorarios.push(`${primeiro.data} ${primeiro.horario}`);\n    const blocosMesmoDia = blocosPeriodo.filter(b => b.data === primeiro.data);\n    const segundoMesmoDia = blocosMesmoDia.find(b => b.minutos - primeiro.minutos >= 120);\n    const segundo = segundoMesmoDia || blocosPeriodo.find(b => b.data > primeiro.data);\n    if (segundo) {\n      sugestoesHorarios.push(`${segundo.data} ${segundo.horario}`);\n      resultado = `📅 Encontrei dois horários disponíveis no período da *${labelPeriodo}*:\\n\\n${fmtBloco(primeiro)}\\n${fmtBloco(segundo)}\\n\\nQual desses fica melhor para você?`;\n    } else {\n      resultado = `📅 Encontrei o seguinte horário no período da *${labelPeriodo}*:\\n\\n${fmtBloco(primeiro)}\\n\\nEsse horário funciona para você?`;\n    }\n  }\n}\n// CASO A: data muito distante e cliente não insistiu — sugere mais cedo.\nelse if (bloqueado) {\n  const limiteData = agora.startOf('day').plus({ days: LIMITE_DIAS }).toFormat('yyyy-MM-dd');\n  const blocosDentroLimite = todosBlocos.filter(b => b.data <= limiteData);\n  const proximos = topNDiasComMelhorHorario(\n    blocosDentroLimite,\n    agora.toFormat('yyyy-MM-dd'),\n    minSolicitado,\n    3\n  );\n\n  if (proximos.length === 0) {\n    resultado = `\\uD83D\\uDE15 Não há horários disponíveis nos próximos ${LIMITE_DIAS} dias.\\n\\nPosso verificar outra data?`;\n  } else {\n    proximos.forEach(b => sugestoesHorarios.push(`${b.data} ${b.horario}`));\n    resultado =\n      `\\u26A0\\uFE0F A data que você pediu (*${dtLabel}*) está a *${Math.ceil(diffDias)} dias* de hoje.\\n\\n` +\n      `Para garantir um atendimento mais rápido, separei os horários disponíveis mais próximos:\\n\\n` +\n      proximos.map(fmtBloco).join('\\n');\n  }\n}\n// CASO B: fluxo normal — DIA é prioridade.\nelse if (!periodoPreferencia) {\n  // 1. Filtra blocos do dia pedido (se houver data alvo)\n  const blocosDoDia = dataAlvo\n    ? todosBlocos.filter(b => b.data === dataAlvo)\n    : [];\n\n  // ── B.1: dia pedido tem slots ──\n  if (blocosDoDia.length > 0) {\n    // Tenta match exato no dia\n    const exato = minSolicitado >= 0\n      ? blocosDoDia.find(b => b.minutos === minSolicitado)\n      : null;\n\n    if (exato) {\n      exactMatch = true;\n      sugestoesHorarios.push(`${exato.data} ${exato.horario}`);\n      resultado =\n        `\\u2705 Ótima notícia! O horário *${dtLabel} às ${exato.horario}* está disponível ` +\n        `com *${exato.profNome}*.\\n\\nPosso confirmar sua avaliação?`;\n    } else {\n      // Sem exato: oferece 3 do MESMO dia ordenados por proximidade\n      const opcoes = topNPorProximidade(blocosDoDia, minSolicitado, 3);\n      opcoes.forEach(b => sugestoesHorarios.push(`${b.data} ${b.horario}`));\n\n      const intro = minSolicitado >= 0\n        ? `Não temos exatamente às *${hRaw}* em *${dtLabel}*, mas tenho estas opções no mesmo dia:`\n        : `Encontrei os seguintes horários disponíveis em *${dtLabel}*:`;\n\n      resultado =\n        `\\uD83D\\uDCC5 ${intro}\\n\\n` +\n        opcoes.map(fmtBloco).join('\\n') +\n        `\\n\\nQual desses fica melhor para você?`;\n    }\n  }\n  // ── B.2: dia pedido sem slots → oferece outros dias ──\n  else {\n    const dataRef  = dataAlvo || agora.toFormat('yyyy-MM-dd');\n    const proximos = topNDiasComMelhorHorario(todosBlocos, dataRef, minSolicitado, 3);\n\n    if (proximos.length === 0) {\n      resultado = dataAlvo\n        ? `\\uD83D\\uDE15 Não há horários disponíveis em *${dtLabel}* nem nos dias seguintes. Posso verificar outras datas?`\n        : `\\uD83D\\uDE15 Não há horários disponíveis no período consultado. Posso verificar outras datas?`;\n    } else {\n      proximos.forEach(b => sugestoesHorarios.push(`${b.data} ${b.horario}`));\n      const intro = dataAlvo\n        ? `Não há horários em *${dtLabel}*, mas encontrei estas opções nos dias mais próximos:`\n        : `Encontrei estas opções nos dias mais próximos:`;\n      resultado =\n        `\\uD83D\\uDCC5 ${intro}\\n\\n` +\n        proximos.map(fmtBloco).join('\\n') +\n        `\\n\\nQual desses fica melhor para você?`;\n    }\n  }\n}\n\nreturn {\n  json: {\n    resultado,\n    sugestoes_horarios:      sugestoesHorarios,\n    data_distante_bloqueada: bloqueado,\n    exact_match:             exactMatch,\n    diff_dias:               Math.ceil(diffDias),\n    total_dias_api:          diasAPI.length,\n    total_blocos_validos:    todosBlocos.length,\n    usando_fallback:         usandoFallback\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        288,
        112
      ],
      "id": "bd8ac44d-e9ce-46ff-8b36-b6aea85f24d4",
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
        512,
        112
      ],
      "id": "4c2f1bbc-c9d0-4078-8a53-8ea63c1457a4",
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
        736,
        112
      ],
      "id": "97301a2a-ce36-4d08-af4b-173639813c49",
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
        64,
        400
      ],
      "id": "cdaae41c-bd6d-413e-8a83-6819c6ff249e",
      "name": "Verificar Agenda Agendar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "// ── Validar Slot Agendar — Oral Bem Joinville ─────────────────────────\nlet d = {};\ntry { d = $('Configuracao Unidades').first().json; } catch(e) { d = $input.item.json; }\n\nconst PROF_PRINCIPAL = { id: String(d.config_agenda?.profissional?.id || ''),          nome: d.config_agenda?.profissional?.nome || 'Profissional' };\nconst PROF_FALLBACK  = { id: String(d.config_agenda?.profissional_fallback?.id || ''), nome: d.config_agenda?.profissional_fallback?.nome || '' };\n\nconst inputItems    = $input.all().map(i => i.json);\nconst isNovoFormato = inputItems.length > 0 && Array.isArray(inputItems[0].AvaliableTimes);\n\nlet slots = [];\nif (isNovoFormato) {\n  slots = (inputItems[0].AvaliableTimes || []).filter(s => s.isSelectable !== false);\n} else {\n  slots = inputItems;\n}\n\nconst norm = h => {\n  if (!h) return '';\n  const p = h.toString().split(':');\n  return p[0].padStart(2,'0') + ':' + (p[1]||'00').padStart(2,'0');\n};\n\nconst hAlvo = norm(d.horario_agendado || '');\n\nfunction buscarSlot(profId) {\n  return slots.find(s => {\n    const id   = String(isNovoFormato ? s.professionalId : s.ProfessionalId);\n    const from = norm(isNovoFormato ? s.from : s.From);\n    return id === profId && from === hAlvo;\n  }) || null;\n}\n\nlet v = { aprovado: false, motivo: 'Horário indisponível.' };\nlet idF = null, nomeF = '';\n\nif (!slots.length) {\n  v.motivo = 'Não há agenda aberta ou horários disponíveis neste dia.';\n} else if (!hAlvo) {\n  v.motivo = 'Horário solicitado não informado.';\n} else {\n  let slotEncontrado = buscarSlot(PROF_PRINCIPAL.id);\n  if (slotEncontrado) {\n    v = { aprovado: true, motivo: 'Horário disponível.' };\n    idF = PROF_PRINCIPAL.id; nomeF = PROF_PRINCIPAL.nome;\n  } else if (PROF_FALLBACK.id) {\n    slotEncontrado = buscarSlot(PROF_FALLBACK.id);\n    if (slotEncontrado) {\n      v = { aprovado: true, motivo: 'Horário disponível.' };\n      idF = PROF_FALLBACK.id; nomeF = PROF_FALLBACK.nome;\n    }\n  }\n  if (!v.aprovado) {\n    v.motivo = `O horário ${d.horario_agendado} não está disponível.`;\n  }\n}\n\nreturn {\n  json: {\n    ...d,\n    validacao:               v,\n    id_profissional_final:   idF,\n    nome_profissional_final: nomeF,\n    hora_buscada:            hAlvo,\n    slots_encontrados_total: slots.length\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        288,
        400
      ],
      "id": "e325ee53-349c-4e39-92a9-0d7a0885c02f",
      "name": "Validar Slot Agendar"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
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
        512,
        400
      ],
      "id": "65915be5-2917-4991-a88f-20072d6dcc68",
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
        736,
        496
      ],
      "id": "5013b3ce-8f92-4867-8265-6e62898b439e",
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
        960,
        496
      ],
      "id": "95cce14d-ec15-43d1-b09c-532c13b86499",
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
              "value": "={{ $('Configuracao Unidades').first().json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        736,
        304
      ],
      "id": "5de1fc6c-fc04-4431-bca8-3b8ed7a99fa3",
      "name": "Buscar Paciente Agendar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
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
        960,
        304
      ],
      "id": "6b1557e9-a79e-4152-90c2-c81e41e841d5",
      "name": "Paciente Existe?"
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
              "value": "={{ $('Validar Slot Agendar').item.json.config_agenda.authorization }}"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"subscriber_id\": \"{{ $('Configuracao Unidades').first().json.config_agenda.subscriber_id }}\",\n  \"Name\": \"{{ $('Configuracao Unidades').first().json.nome_paciente }}\",\n  \"MobilePhone\": \"{{ $('Configuracao Unidades').first().json.telefone_limpo }}\",\n  \"Notes\": \"Paciente cadastrado via IA (Oral Bem Joinville)\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        1184,
        400
      ],
      "id": "398da3de-3429-46f8-ad61-37fc8b1f6505",
      "name": "Criar Novo Paciente"
    },
    {
      "parameters": {
        "jsCode": "let idFinal = null;\nlet telefoneFinal = null;\n\ntry {\n  const novo = $('Criar Novo Paciente').all();\n  if (novo.length > 0) {\n    idFinal = novo[0].json.id || novo[0].json.PatientId || novo[0].json.personId || null;\n  }\n} catch(e) {}\n\nif (!idFinal) {\n  try {\n    const exist = $('Buscar Paciente Agendar').all();\n    if (exist.length > 0) {\n      idFinal       = exist[0].json.id || exist[0].json.PatientId || exist[0].json.personId || null;\n      telefoneFinal = exist[0].json.MobilePhone || exist[0].json.Phone || null;\n    }\n  } catch(e) {}\n}\n\nconst base = $('Validar Slot Agendar').first().json;\n\nif (!telefoneFinal) telefoneFinal = base.telefone_limpo;\ntelefoneFinal = telefoneFinal.toString().replace(/\\D/g, '');\n\nconst dataISO = DateTime.fromFormat(\n  base.data_agendada + ' ' + base.horario_agendado,\n  'yyyy-MM-dd HH:mm',\n  { zone: 'America/Sao_Paulo' }\n).toISO();\n\nconst dur = base.config_agenda?.duracao_servico || 45;\nconst toTime = DateTime.fromFormat(base.horario_agendado, 'HH:mm')\n  .plus({ minutes: dur })\n  .toFormat('HH:mm');\n\nreturn {\n  json: {\n    ...base,\n    id_paciente_final:   idFinal,\n    telefone_prontuario: telefoneFinal,\n    data_agendada_iso:   dataISO,\n    to_time:             toTime\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1408,
        304
      ],
      "id": "7659edb4-f38f-40df-b9c3-f55a2644de37",
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
              "value": "={{ $json.config_agenda.authorization }}"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"Clinic_BusinessId\": {{ $json.config_agenda.business_id }},\n  \"Patient_PersonId\": {{ $json.id_paciente_final }},\n  \"Dentist_PersonId\": {{ $json.id_profissional_final }},\n  \"PatientName\": \"{{ $('Configuracao Unidades').first().json.nome_paciente }}\",\n  \"MobilePhone\": \"{{ $json.telefone_prontuario }}\",\n  \"date\": \"{{ $json.data_agendada_iso }}\",\n  \"fromTime\": \"{{ $json.horario_agendado }}\",\n  \"toTime\": \"{{ $json.to_time }}\",\n  \"Notes\": \"Agendamento realizado via IA (Oral Bem Joinville)\",\n  \"CategoryColor\": \"#FF5733\",\n  \"CategoryDescription\": \"Avaliação\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        1632,
        304
      ],
      "id": "1c9f5fb0-79f2-4e8c-997e-cfce3c44ef02",
      "name": "Agendar Na Clinicorp"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Agendamento confirmado! ✅\\n\\n🗓️ Data: {{ $('Configuracao Unidades').first().json.data_agendada }}\\n⏰ Horário: {{ $('Configuracao Unidades').first().json.horario_agendado }}\\n📍 Unidade: {{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}\\n\\nPosso ajudar em algo mais?\",\n  \"status\": \"sucesso\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        1856,
        304
      ],
      "id": "dd4b4df7-e2a0-4ee1-a22d-3859e4484fc5",
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
        2080,
        304
      ],
      "id": "74ad1b8d-ff7c-4794-b69d-42e3dbcafee5",
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
        64,
        784
      ],
      "id": "1b0b3f87-e057-4435-9544-83b77606c0d0",
      "name": "Buscar Paciente Cancelar",
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
        288,
        784
      ],
      "id": "b9e28b23-b981-4e39-a63b-9cf03e51bda3",
      "name": "Listar Agmts Cancelar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "const config   = $('Configuracao Unidades').first().json;\nconst horaAlvo = config.horario_agendado;\nconst agmts    = $input.all().map(i => i.json);\n\nconst norm = h => {\n  if (!h) return '';\n  const p = h.toString().split(':');\n  return p[0].padStart(2,'0') + ':' + (p[1]||'00').padStart(2,'0');\n};\n\nlet enc = null;\n\nfor (const a of agmts) {\n  if (a.id && a.Deleted !== 'X' && norm(a.fromTime) === norm(horaAlvo)) { enc = a; break; }\n}\n\nif (!enc) {\n  for (const a of agmts) {\n    if (a.id && a.Deleted !== 'X') { enc = a; break; }\n  }\n}\n\nconst agendamentoId = enc ? enc.id : null;\n\nreturn { json: {\n  ...config,\n  agendamento_id:         agendamentoId,\n  agendamento_encontrado: !!agendamentoId,\n  dados_agendamento:      enc || null\n} };"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        512,
        784
      ],
      "id": "f52159d2-3c39-4981-91ec-dd3cd64f3a26",
      "name": "Filtrar Agmt Cancelar"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
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
        736,
        784
      ],
      "id": "f64b3ebf-b120-48b2-b2fb-b749958c6db1",
      "name": "Achou Para Cancelar?"
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
              "value": "={{ $json.config_agenda.authorization }}"
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
        960,
        688
      ],
      "id": "45666ec0-df52-4d45-950f-8a3828b1e208",
      "name": "Cancelar Na Clinicorp"
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
        1184,
        688
      ],
      "id": "95d1e0f1-cf7d-441c-9241-9380d40f0292",
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
        1408,
        688
      ],
      "id": "5f1ec064-e0b4-4f33-913e-6cf3b2227b2a",
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
        960,
        880
      ],
      "id": "53825c5d-f585-40e5-8b3d-0ce2646bd96f",
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
        1184,
        880
      ],
      "id": "5ad160c7-b835-4f90-bcb8-7704e125a11b",
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
            },
            {
              "name": "Name",
              "value": "={{ $json.nome_paciente }}"
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
        64,
        1168
      ],
      "id": "7d75ae66-d17b-4439-8106-2271b67eefd7",
      "name": "Buscar Paciente Remarcar",
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
        288,
        1168
      ],
      "id": "6491a104-d678-4d85-8dbd-246b34256250",
      "name": "Listar Agmts Remarcar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "const config = $('Configuracao Unidades').first().json;\nconst agmts  = $input.all().map(i => i.json);\nlet enc = null;\nfor (const a of agmts) {\n  if (a.id && a.Deleted !== 'X') { enc = a; break; }\n}\nreturn { json: { ...config,\n  agendamento_id_antigo:    enc ? enc.id : null,\n  agendamento_encontrado:   !!enc,\n  dados_agendamento_antigo: enc || null,\n  data_hora_antiga:         enc ? (enc.AppointmentDate + ' ' + enc.fromTime) : null\n} };"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        512,
        1168
      ],
      "id": "9d7dffae-f123-4c68-a783-75b7361b0e26",
      "name": "Filtrar Agmt Antigo"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
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
        736,
        1168
      ],
      "id": "2ef8a2aa-d387-45cc-89c7-2a676911f952",
      "name": "Achou o Antigo?"
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
              "value": "={{ $json.config_agenda.authorization }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        960,
        1072
      ],
      "id": "ec3cece7-b583-4c73-846f-63746bf173eb",
      "name": "Verificar Slots Remarcar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "// ── Validar Slot Remarcar — Oral Bem Joinville ────────────────────────\nlet d = {};\ntry { d = $('Configuracao Unidades').first().json; } catch(e) { d = $input.item.json; }\n\nconst PROF_PRINCIPAL = { id: String(d.config_agenda?.profissional?.id || ''),          nome: d.config_agenda?.profissional?.nome || 'Profissional' };\nconst PROF_FALLBACK  = { id: String(d.config_agenda?.profissional_fallback?.id || ''), nome: d.config_agenda?.profissional_fallback?.nome || '' };\n\nconst inputItems    = $input.all().map(i => i.json);\nconst isNovoFormato = inputItems.length > 0 && Array.isArray(inputItems[0].AvaliableTimes);\n\nlet slots = [];\nif (isNovoFormato) {\n  slots = (inputItems[0].AvaliableTimes || []).filter(s => s.isSelectable !== false);\n} else {\n  slots = inputItems;\n}\n\nconst norm = h => {\n  if (!h) return '';\n  const p = h.toString().split(':');\n  return p[0].padStart(2,'0') + ':' + (p[1]||'00').padStart(2,'0');\n};\n\nconst hAlvo = norm(d.horario_agendado || '');\n\nfunction buscarSlot(profId) {\n  return slots.find(s => {\n    const id   = String(isNovoFormato ? s.professionalId : s.ProfessionalId);\n    const from = norm(isNovoFormato ? s.from : s.From);\n    return id === profId && from === hAlvo;\n  }) || null;\n}\n\nlet v = { aprovado: false, motivo: 'Horário indisponível.' };\nlet idF = null, nomeF = '';\n\nif (!slots.length) {\n  v.motivo = 'Não há agenda aberta ou horários disponíveis neste dia.';\n} else if (!hAlvo) {\n  v.motivo = 'Horário solicitado não informado.';\n} else {\n  let slotEncontrado = buscarSlot(PROF_PRINCIPAL.id);\n  if (slotEncontrado) {\n    v = { aprovado: true, motivo: 'Horário disponível.' };\n    idF = PROF_PRINCIPAL.id; nomeF = PROF_PRINCIPAL.nome;\n  } else if (PROF_FALLBACK.id) {\n    slotEncontrado = buscarSlot(PROF_FALLBACK.id);\n    if (slotEncontrado) {\n      v = { aprovado: true, motivo: 'Horário disponível.' };\n      idF = PROF_FALLBACK.id; nomeF = PROF_FALLBACK.nome;\n    }\n  }\n  if (!v.aprovado) {\n    v.motivo = `O horário ${d.horario_agendado} não está disponível.`;\n  }\n}\n\nlet patientIdRemarcar = null;\ntry { patientIdRemarcar = $('Buscar Paciente Remarcar').first().json.PatientId; } catch(e) {}\n\nlet agendamentoIdAntigo = null;\ntry { agendamentoIdAntigo = $('Filtrar Agmt Antigo').first().json.agendamento_id_antigo; } catch(e) {}\n\nconst dataISO = DateTime.fromFormat(\n  d.data_agendada + ' ' + d.horario_agendado,\n  'yyyy-MM-dd HH:mm',\n  { zone: 'America/Sao_Paulo' }\n).toISO();\n\nreturn {\n  json: {\n    ...d,\n    validacao:               v,\n    id_profissional_final:   idF,\n    nome_profissional_final: nomeF,\n    hora_buscada:            hAlvo,\n    slots_encontrados_total: slots.length,\n    patient_id_remarcar:     patientIdRemarcar,\n    agendamento_id_antigo:   agendamentoIdAntigo,\n    data_agendada_iso:       dataISO\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1184,
        1072
      ],
      "id": "65edd5ec-49e9-4d4d-9e7d-d69536eba58b",
      "name": "Validar Slot Remarcar"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
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
        1408,
        1072
      ],
      "id": "3c07bdf7-eeef-4875-bf46-ec5acd12bd60",
      "name": "Novo Horario Valido?"
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
              "value": "={{ $json.config_agenda.authorization }}"
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
        1632,
        784
      ],
      "id": "cf942227-bcb8-4698-89fc-e47e40c0eaf9",
      "name": "Cancelar Antigo Remarcar"
    },
    {
      "parameters": {
        "jsCode": "const base = $('Validar Slot Remarcar').first().json;\nconst dur  = base.config_agenda?.duracao_servico || 45;\n\nconst dataISO = DateTime.fromFormat(\n  base.data_agendada + ' ' + base.horario_agendado,\n  'yyyy-MM-dd HH:mm',\n  { zone: 'America/Sao_Paulo' }\n).toISO();\n\nconst toTime = DateTime.fromFormat(base.horario_agendado, 'HH:mm')\n  .plus({ minutes: dur })\n  .toFormat('HH:mm');\n\nreturn {\n  json: {\n    ...base,\n    id_paciente_final: base.patient_id_remarcar,\n    data_agendada_iso: dataISO,\n    to_time:           toTime\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1856,
        784
      ],
      "id": "6475928f-2f0c-4e46-91c4-f7dd8ddace20",
      "name": "Recuperar Reagendamento"
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
              "value": "={{ $json.config_agenda.authorization }}"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"Clinic_BusinessId\": {{ $json.config_agenda.business_id }},\n  \"Patient_PersonId\": {{ $json.id_paciente_final }},\n  \"Dentist_PersonId\": {{ $json.id_profissional_final }},\n  \"PatientName\": \"{{ $('Configuracao Unidades').first().json.nome_paciente }}\",\n  \"MobilePhone\": \"{{ $('Configuracao Unidades').first().json.telefone_limpo }}\",\n  \"date\": \"{{ $json.data_agendada_iso }}\",\n  \"fromTime\": \"{{ $json.horario_agendado }}\",\n  \"toTime\": \"{{ $json.to_time }}\",\n  \"Notes\": \"Reagendamento realizado via IA (Oral Bem Joinville)\",\n  \"CategoryColor\": \"#FF5733\",\n  \"CategoryDescription\": \"Avaliação\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [
        2080,
        784
      ],
      "id": "7c04eab9-7805-4cc9-8c0d-72fa263bcf87",
      "name": "Reagendar Clinicorp"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Agendamento remarcado com sucesso! 🔄\\n\\nEra: {{ $('Filtrar Agmt Antigo').first().json.data_hora_antiga }}\\nFicou para: {{ $('Configuracao Unidades').first().json.data_agendada }} às {{ $('Configuracao Unidades').first().json.horario_agendado }}\",\n  \"status\": \"sucesso\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        2304,
        784
      ],
      "id": "fe7cb138-cfde-4ba3-a411-2aeb905a4829",
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
              "fieldValue": "=Trocou de {{ $('Filtrar Agmt Antigo').first().json.data_hora_antiga }} PARA {{ $('Configuracao Unidades').first().json.data_agendada }} {{ $('Configuracao Unidades').first().json.horario_agendado }}"
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
        2528,
        784
      ],
      "id": "d8f361e8-96cb-41ed-b458-62850077ec18",
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
        "responseBody": "={\n  \"resultado\": \"Não encontrei agendamento para remarcar. Poderia confirmar a data atual do agendamento?\",\n  \"status\": \"agendamento_nao_encontrado\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        960,
        1264
      ],
      "id": "3be2ab8d-1a87-4275-8a6c-699e72c835b9",
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
              "fieldValue": "=Paciente tentou alterar {{ $('Configuracao Unidades').first().json.data_antiga }} mas não existia."
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
        1184,
        1264
      ],
      "id": "0578e075-7e9c-4d8f-92ef-1559d064065f",
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
        1632,
        1168
      ],
      "id": "6e015547-060b-4222-bf20-60c8b59e93e3",
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
        1856,
        1168
      ],
      "id": "2e75f32f-5167-4b82-b21f-c39fd00dd4a8",
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
            },
            {
              "name": "name",
              "value": "={{ $json.nome_paciente }}"
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
        64,
        1552
      ],
      "id": "f62dea84-de97-4c7d-b6ec-a51cd43cf376",
      "name": "Buscar Paciente Verificar",
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
        288,
        1552
      ],
      "id": "8c1ab93d-be44-4674-8f24-8247c2c20c04",
      "name": "Listar Agmts Verificar",
      "alwaysOutputData": true
    },
    {
      "parameters": {
        "jsCode": "const config = $('Configuracao Unidades').first().json;\nconst agmts  = $input.all().map(i => i.json);\nlet prox = null;\n\nfor (const a of agmts) {\n  if (a.id && a.Deleted !== 'X') { prox = a; break; }\n}\n\nreturn { json: { ...config,\n  proximo_encontrado: !!prox,\n  proximo_data:       prox ? prox.AppointmentDate : null,\n  proximo_hora:       prox ? prox.fromTime : null,\n  proximo_id:         prox ? prox.id : null,\n  dados_proximo:      prox || null\n} };"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        512,
        1552
      ],
      "id": "83256617-7215-4ac1-9d7d-b216f8c1b174",
      "name": "Filtrar Proximo Agmt"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "version": 2,
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
        736,
        1552
      ],
      "id": "87e5579c-977e-4c56-a358-00e4d8a227bd",
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
        960,
        1456
      ],
      "id": "ff9efb21-39eb-42a3-949b-919383fa97c1",
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
        1184,
        1456
      ],
      "id": "11ccf10f-a2d8-4816-bc32-9bea6a290386",
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
        960,
        1648
      ],
      "id": "7261e9ca-caf7-4807-a9e4-c0d936e9a79b",
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
        1184,
        1648
      ],
      "id": "d36a35a2-2f93-4f83-a66a-5758a25a6658",
      "name": "LOG Verificar Nao Encontrado",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
            "node": "Buscar Paciente Cancelar",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Buscar Paciente Remarcar",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Buscar Paciente Verificar",
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
            "node": "Criar Novo Paciente",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Criar Novo Paciente": {
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
    "Buscar Paciente Cancelar": {
      "main": [
        [
          {
            "node": "Listar Agmts Cancelar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Listar Agmts Cancelar": {
      "main": [
        [
          {
            "node": "Filtrar Agmt Cancelar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filtrar Agmt Cancelar": {
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
    "Achou Para Cancelar?": {
      "main": [
        [
          {
            "node": "Cancelar Na Clinicorp",
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
    "Cancelar Na Clinicorp": {
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
    "Buscar Paciente Remarcar": {
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
    "Listar Agmts Remarcar": {
      "main": [
        [
          {
            "node": "Filtrar Agmt Antigo",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filtrar Agmt Antigo": {
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
    "Achou o Antigo?": {
      "main": [
        [
          {
            "node": "Verificar Slots Remarcar",
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
    "Verificar Slots Remarcar": {
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
            "node": "Cancelar Antigo Remarcar",
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
    "Cancelar Antigo Remarcar": {
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
    "Recuperar Reagendamento": {
      "main": [
        [
          {
            "node": "Reagendar Clinicorp",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Reagendar Clinicorp": {
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
    "Buscar Paciente Verificar": {
      "main": [
        [
          {
            "node": "Listar Agmts Verificar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Listar Agmts Verificar": {
      "main": [
        [
          {
            "node": "Filtrar Proximo Agmt",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filtrar Proximo Agmt": {
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
    }
  },
  "pinData": {
    "INICIO": [
      {
        "headers": {
          "host": "webhook.dentistapower.com.br",
          "content-length": "106",
          "content-type": "application/json; charset=utf-8",
          "traceparent": "00-2a7633b566817d807fbaacfe81153522-fa19a63bd393e89a-01",
          "tracestate": "@nr=0-0---fa19a63bd393e89a-28f790ec817a069f-1-1.2955-1777381228727",
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
          "data_inicio": "2026-05-05",
          "horario_preferido": "09:00"
        },
        "webhookUrl": "https://webhook.dentistapower.com.br/webhook/agendamentos-obclinic",
        "executionMode": "production"
      }
    ]
  },
  "meta": {
    "instanceId": "d1a2ea4f12ae9ebd3132590ec74e61784d3b49e17967bcb70d511f83551a7c49"
  }
}