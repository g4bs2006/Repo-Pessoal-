{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "agendamentos-conquista-sorrisos",
        "responseMode": "responseNode",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        -1200,
        864
      ],
      "id": "9cc4feeb-9ad8-453e-875f-7124a4e21348",
      "name": "AGENDAMENTO",
      "webhookId": "00000000-0000-0000-0000-000000000001"
    },
    {
      "parameters": {
        "jsCode": "const body = $input.item.json.body || $input.item.json;\n\nconst telefoneRaw = body.telefone_cliente || body.telefone_contato || body.telefone || '';\nconst telefoneLimpo = telefoneRaw.toString().replace(/\\D/g, '');\nconst nomePaciente = body.nome_cliente || body.nome_contato || 'Paciente';\n\nconst TIMEZONE = 'America/Sao_Paulo';\n\n// REGRAS DE HORÁRIO\n// SEG-SEX (1-5): 07h30 às 18h30\n// SAB (6):       07h30 às 13h30\n// DOM (7):       Fechado\nconst REGRAS_SEMANA = {\n    1: { ini: {h:7,m:30}, fim: {h:18,m:30} },\n    2: { ini: {h:7,m:30}, fim: {h:18,m:30} },\n    3: { ini: {h:7,m:30}, fim: {h:18,m:30} },\n    4: { ini: {h:7,m:30}, fim: {h:18,m:30} },\n    5: { ini: {h:7,m:30}, fim: {h:18,m:30} },\n    6: { ini: {h:7,m:30}, fim: {h:13,m:30} },\n    7: null\n};\n\n// CONFIGURAÇÃO DA UNIDADE (ÚNICA)\nconst config_agenda = {\n    id_agenda: '69432ab15cf3498befe35dbdff3f3dc6c5d87969b31e68fc94b794a7b7996393@group.calendar.google.com',\n    nome_unidade: 'Conquista Sorrisos',\n    nome_empresa: 'Conquista Sorrisos',\n    endereco: 'Avenida Lauro de Freitas 354 - Centro - Vitória da Conquista - BA',\n    timezone: TIMEZONE,\n    regras_horario: REGRAS_SEMANA,\n    duracao_servico: 15,\n    capacidade_simultanea: 2,\n    trava_agendamento: 5,\n    trava_remarcacao: 2\n};\n\nlet dataFinal = '';\nlet horaFinal = '';\nlet dataAntigaBusca = null;\n\nconst dataRaw = body.data_iso || body.data_inicio || body.data_agendada;\nif (dataRaw) {\n    let dt = DateTime.fromISO(dataRaw, { zone: TIMEZONE });\n    if (!dt.isValid) dt = DateTime.fromFormat(dataRaw, 'dd/MM/yyyy HH:mm', { zone: TIMEZONE });\n    if (dt.isValid) {\n        dataFinal = dt.toFormat('dd/MM/yyyy');\n        horaFinal = dt.toFormat('HH:mm');\n    }\n}\n\nif (body.data_antiga) {\n    let dtAntiga = DateTime.fromISO(body.data_antiga, { zone: TIMEZONE });\n    if (!dtAntiga.isValid) dtAntiga = DateTime.fromFormat(body.data_antiga, 'dd/MM/yyyy HH:mm', { zone: TIMEZONE });\n    if (dtAntiga.isValid) dataAntigaBusca = dtAntiga.toISO();\n}\n\nreturn {\n  json: {\n    ...body,\n    data_agendada: dataFinal,\n    horario_agendado: horaFinal,\n    data_antiga_iso: dataAntigaBusca,\n    telefone_limpo: telefoneLimpo,\n    nome_paciente: nomePaciente,\n    unidade_selecionada: 'conquista_sorrisos',\n    config_agenda: config_agenda,\n    acao_fluxo: body.action\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -976,
        864
      ],
      "id": "f2feca3e-0985-48df-a071-8b6839d0a091",
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
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "verificar_disponibilidade",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    },
                    "id": "pv-switch-01"
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
                    "id": "pv-switch-02",
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "realizar_agendamento",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
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
                    "id": "pv-switch-03",
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "cancelar_agendamento",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
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
                    "id": "pv-switch-04",
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "remarcar_agendamento",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
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
                    "id": "pv-switch-05",
                    "leftValue": "={{ $json.acao_fluxo }}",
                    "rightValue": "verificar_agendamento_paciente",
                    "operator": {
                      "type": "string",
                      "operation": "equals",
                      "name": "filter.operator.equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "VERIFICAR SE TEM AVALIACAO (PACIENTE)"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.3,
      "position": [
        -752,
        816
      ],
      "id": "43a7a25e-374a-4ec8-b776-c6fca94e9eb1",
      "name": "Guarda de Trânsito"
    },
    {
      "parameters": {
        "operation": "getAll",
        "calendar": {
          "__rl": true,
          "value": "={{ $('Configuracao Unidades').first().json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "returnAll": true,
        "timeMin": "={{ $json.data_solicitada ? DateTime.fromFormat($json.data_solicitada, 'dd/MM/yyyy HH:mm', {zone: 'America/Sao_Paulo'}).minus({hours: 3}).toISO() : $now.minus({hours: 3}).toISO() }}",
        "timeMax": "={{ $now.setZone('America/Sao_Paulo').plus({ days: 15 }).endOf('day').toISO() }}",
        "options": {}
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        -528,
        192
      ],
      "id": "1afe85c7-9637-4018-aa60-aa3f59e2eb56",
      "name": "Ler Agenda (Check)",
      "alwaysOutputData": true,
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const itemConfig = $('Configuracao Unidades').first().json;\nconst configAgenda = itemConfig.config_agenda || {};\n\nconst TIMEZONE = configAgenda.timezone || 'America/Sao_Paulo';\nconst DURACAO_MINUTOS = configAgenda.duracao_servico || 15;\nconst CAPACIDADE_MAXIMA = configAgenda.capacidade_simultanea || 2;\nconst MIN_GAP_MINUTES = 60; // Reduzido para 1h para dar opções melhores\n\nconst eventosOcupados = $input.all().map(i => i.json);\nconst agora = DateTime.now().setZone(TIMEZONE);\nconst inicioSeguro = agora.plus({ hours: 2 });\n\nfunction isSlotAvailable(slotStart) {\n    let ocupados = 0;\n    const slotEnd = slotStart.plus({ minutes: DURACAO_MINUTOS });\n    for (const evento of eventosOcupados) {\n        if (!evento || !evento.status || evento.status === 'cancelled') continue;\n        let iniEvt, fimEvt;\n        if (evento.start && evento.start.dateTime) {\n            iniEvt = DateTime.fromISO(evento.start.dateTime).setZone(TIMEZONE);\n        } else if (evento.start && evento.start.date) {\n            iniEvt = DateTime.fromISO(evento.start.date).setZone(TIMEZONE).startOf('day');\n        } else { continue; }\n        if (evento.end && evento.end.dateTime) {\n            fimEvt = DateTime.fromISO(evento.end.dateTime).setZone(TIMEZONE);\n        } else if (evento.end && evento.end.date) {\n            fimEvt = DateTime.fromISO(evento.end.date).setZone(TIMEZONE).endOf('day');\n        } else { continue; }\n        if (slotStart < fimEvt && slotEnd > iniEvt) ocupados++;\n    }\n    return ocupados < CAPACIDADE_MAXIMA;\n}\n\nconst getMin = (cfg) => cfg.h * 60 + cfg.m;\n\n// Detectar se foi solicitado um horário específico ou apenas o dia/período\nlet horarioSolicitado = null;\nif (itemConfig.data_inicio) {\n    horarioSolicitado = DateTime.fromISO(itemConfig.data_inicio, { zone: TIMEZONE });\n}\n\n// Se o horário for 00:00, assumimos que ele quer \"qualquer horário\" no dia/período\nconst solicitouHorarioEspecifico = horarioSolicitado && horarioSolicitado.isValid && (horarioSolicitado.hour !== 0 || horarioSolicitado.minute !== 0);\n\nlet solicitadoDisponivel = false;\nif (solicitouHorarioEspecifico && horarioSolicitado >= inicioSeguro) {\n    const diaSem = horarioSolicitado.weekday;\n    const regraDia = configAgenda.regras_horario ? configAgenda.regras_horario[diaSem] : null;\n    if (regraDia) {\n        const minSol = horarioSolicitado.hour * 60 + horarioSolicitado.minute;\n        const minFimSol = minSol + DURACAO_MINUTOS;\n        const pIni = getMin(regraDia.ini);\n        const pFim = getMin(regraDia.fim);\n        if (minSol >= pIni && minFimSol <= pFim && isSlotAvailable(horarioSolicitado)) {\n            solicitadoDisponivel = true;\n        }\n    }\n}\n\nlet respostaFinal = '';\nlet sugestoesISO = [];\n\nif (solicitadoDisponivel) {\n    const fmt = horarioSolicitado.setLocale('pt-BR').toFormat('dd/MM (ccc)');\n    const hora = horarioSolicitado.toFormat('HH:mm');\n    respostaFinal = `✅ O horário solicitado está disponível!\\n\\n🗓️ *${fmt}* às *${hora}*\\n🏥 Unidade: ${configAgenda.nome_unidade}\\n\\nDeseja confirmar o agendamento?`;\n    sugestoesISO = [horarioSolicitado.toISO()];\n} else {\n    let sugestoes = [];\n    let cursorDia = solicitouHorarioEspecifico ? horarioSolicitado.startOf('day') : (horarioSolicitado || agora).startOf('day');\n    let diasVerificados = 0;\n    const MAX_DIAS_BUSCA = 7;\n    const MAX_OPCOES = 3;\n    const periodo = itemConfig.periodo_preferencia; \n\n    while (sugestoes.length < MAX_OPCOES && diasVerificados < MAX_DIAS_BUSCA) {\n        const regraDia = configAgenda.regras_horario ? configAgenda.regras_horario[cursorDia.weekday] : null;\n        if (regraDia) {\n            let loopTime = cursorDia.set({ hour: regraDia.ini.h, minute: regraDia.ini.m });\n            const fimTurno = cursorDia.set({ hour: regraDia.fim.h, minute: regraDia.fim.m });\n            \n            while (loopTime.plus({minutes: DURACAO_MINUTOS}) <= fimTurno) {\n                if (sugestoes.length >= MAX_OPCOES) break;\n                \n                if (periodo === 'manha' && loopTime.hour >= 12) break;\n                if (periodo === 'tarde' && loopTime.hour < 12) {\n                    loopTime = loopTime.set({ hour: 12, minute: 0 });\n                    continue;\n                }\n\n                if (loopTime >= inicioSeguro && isSlotAvailable(loopTime)) {\n                    sugestoes.push(loopTime);\n                    loopTime = loopTime.plus({ minutes: MIN_GAP_MINUTES });\n                } else {\n                    loopTime = loopTime.plus({ minutes: DURACAO_MINUTOS });\n                }\n            }\n        }\n        cursorDia = cursorDia.plus({ days: 1 });\n        diasVerificados++;\n    }\n\n    if (sugestoes.length > 0) {\n        const linhas = sugestoes\n            .map(s => `🗓️ *${s.setLocale('pt-BR').toFormat('dd/MM (ccc)')}* às *${s.toFormat('HH:mm')}*`)\n            .join('\\n');\n        \n        // MENSAGEM MAIS INTELIGENTE\n        if (solicitouHorarioEspecifico) {\n            respostaFinal = `O horário de ${horarioSolicitado.toFormat('HH:mm')} não está disponível. Mas encontrei estas opções na ${configAgenda.nome_unidade}:\\n\\n${linhas}\\n\\nQual desses fica melhor para você?`;\n        } else {\n            const txtPeriodo = periodo ? ` para o período da ${periodo}` : '';\n            respostaFinal = `Encontrei estes horários disponíveis na ${configAgenda.nome_unidade}${txtPeriodo}:\\n\\n${linhas}\\n\\nAlgum desses funciona para você?`;\n        }\n    } else {\n        respostaFinal = `Não encontrei horários disponíveis nos próximos dias na ${configAgenda.nome_unidade}. Gostaria de tentar outra data?`;\n    }\n    sugestoesISO = sugestoes.map(s => s.toISO());\n}\n\nreturn {\n    json: {\n        resultado: respostaFinal,\n        sugestoes_iso: sugestoesISO,\n        horario_solicitado_disponivel: solicitadoDisponivel\n    }\n};\n"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -304,
        192
      ],
      "id": "424fc22f-b241-4ce0-8751-4cfa1fabdada",
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
        -80,
        192
      ],
      "id": "c00856ae-c05e-4b82-a353-8e4d41e92213",
      "name": "Resp: Disponibilidade"
    },
    {
      "parameters": {
        "operation": "getAll",
        "calendar": {
          "__rl": true,
          "value": "={{ $('Configuracao Unidades').first().json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "returnAll": true,
        "timeMin": "={{ DateTime.fromFormat($json.data_agendada, 'dd/MM/yyyy', {zone: 'America/Sao_Paulo'}).minus({hours: 3}).toISO() }}",
        "timeMax": "={{ DateTime.fromFormat($json.data_agendada, 'dd/MM/yyyy', {zone: 'America/Sao_Paulo'}).plus({days: 1}).toISO() }}",
        "options": {}
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        -528,
        480
      ],
      "id": "73ef55c9-a669-46cf-8efe-5ad7d778883d",
      "name": "Ler Agenda (Seguranca)",
      "alwaysOutputData": true,
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const itemConfig = $('Configuracao Unidades').first();\nconst dadosOriginais = itemConfig.json;\nconst configAgenda = dadosOriginais.config_agenda;\n\nconst TIMEZONE = configAgenda.timezone || 'America/Sao_Paulo';\nconst DURACAO_MINUTOS = configAgenda.duracao_servico || 15;\nconst CAPACIDADE_MAXIMA = configAgenda.capacidade_simultanea || 2;\n\nconst eventosOcupados = $input.all().map(i => i.json);\n\nconst dataStr = dadosOriginais.data_agendada;\nconst horaStr = dadosOriginais.horario_agendado;\nconst dataAlvo = DateTime.fromFormat(`${dataStr} ${horaStr}`, 'dd/MM/yyyy HH:mm', { zone: TIMEZONE });\n\nlet validacao = { aprovado: false, motivo: '' };\nconst getMin = (cfg) => cfg.h * 60 + cfg.m;\n\nif (!dataAlvo.isValid) {\n    validacao.motivo = 'Data ou hora em formato inválido.';\n} else {\n    const diaSemana = dataAlvo.weekday;\n    const regraDia = configAgenda.regras_horario[diaSemana];\n    if (!regraDia) {\n        validacao.motivo = 'A clínica não abre neste dia da semana.';\n        validacao.aprovado = false;\n    } else {\n        const minSol = dataAlvo.hour * 60 + dataAlvo.minute;\n        const minFimSol = minSol + DURACAO_MINUTOS;\n        const pIni = getMin(regraDia.ini);\n        const pFim = getMin(regraDia.fim);\n        \n        if (minSol < pIni || minFimSol > pFim) {\n            validacao.motivo = 'Horário fora do expediente da clínica.';\n            validacao.aprovado = false;\n        } else {\n            const slotInicio = dataAlvo;\n            const slotFim = dataAlvo.plus({ minutes: DURACAO_MINUTOS });\n            let ocupados = 0;\n            for (const evento of eventosOcupados) {\n                if (!evento || !evento.start) continue;\n                if (evento.status === 'cancelled') continue;\n                let iniEvt = DateTime.fromISO(evento.start.dateTime || evento.start.date).setZone(TIMEZONE);\n                let fimEvt = DateTime.fromISO(evento.end.dateTime || evento.end.date).setZone(TIMEZONE);\n                if (slotInicio < fimEvt && slotFim > iniEvt) ocupados++;\n            }\n            if (ocupados < CAPACIDADE_MAXIMA) {\n                validacao.aprovado = true;\n                validacao.motivo = 'Sucesso';\n            } else {\n                validacao.aprovado = false;\n                validacao.motivo = 'Este horário já está ocupado.';\n            }\n        }\n    }\n}\n\nreturn { json: { ...dadosOriginais, validacao } };"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -304,
        480
      ],
      "id": "e0a12b93-23bb-4407-bd3a-be0d6be34a1e",
      "name": "Validar Slot Agendar"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "pv-if-01",
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
        -80,
        480
      ],
      "id": "68d44957-0978-4c04-912b-bd9c7cc46df5",
      "name": "If"
    },
    {
      "parameters": {
        "calendar": {
          "__rl": true,
          "value": "={{ $json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "start": "={{ DateTime.fromFormat($json.data_agendada + ' ' + $json.horario_agendado, 'dd/MM/yyyy HH:mm', {zone: 'America/Sao_Paulo'}).toISO() }}",
        "end": "={{ DateTime.fromFormat($json.data_agendada + ' ' + $json.horario_agendado, 'dd/MM/yyyy HH:mm', {zone: 'America/Sao_Paulo'}).plus({minutes: $('Configuracao Unidades').first().json.config_agenda.duracao_servico}).toISO() }}",
        "additionalFields": {
          "description": "={{ $json.spin || 'Agendamento realizado via IA' }}",
          "summary": "={{ $json.nome_paciente }} - {{ $json.telefone_limpo }}"
        }
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        144,
        384
      ],
      "id": "b90cfdb1-8946-4c2f-bb43-ba2f8fb11648",
      "name": "AGENDAR PACIENTE",
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Agendamento confirmado com sucesso! ✅\\n\\n🗓️ Data: {{ $('Configuracao Unidades').first().json.data_agendada }}\\n⏰ Horário: {{ $('Configuracao Unidades').first().json.horario_agendado }}\\n🏥 Unidade: {{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}\\n📍 Endereço: {{ $('Configuracao Unidades').first().json.config_agenda.endereco }}\\n\\nPosso ajudar em algo mais?\",\n  \"status\": \"sucesso\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        368,
        384
      ],
      "id": "ed51bf93-0e31-4d67-b28a-2a2e95365d08",
      "name": "Resp: Sucesso Agendamento"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Não foi possível confirmar o agendamento para {{ $json.data_agendada }} às {{ $json.horario_agendado }}. Motivo: {{ $json.validacao.motivo }}. Por favor, escolha outro horário.\",\n  \"status\": \"erro_validacao\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        144,
        576
      ],
      "id": "62af39f0-8933-4300-9194-e8a5cc2d86ab",
      "name": "Resp: Erro ao Agendar"
    },
    {
      "parameters": {
        "operation": "getAll",
        "calendar": {
          "__rl": true,
          "value": "={{ $('Configuracao Unidades').first().json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "returnAll": true,
        "timeMin": "={{ DateTime.fromFormat($json.data_agendada + ' ' + $json.horario_agendado, 'dd/MM/yyyy HH:mm', {zone: 'America/Sao_Paulo'}).minus({minutes: 1}).toISO() }}",
        "timeMax": "={{ DateTime.fromFormat($json.data_agendada + ' ' + $json.horario_agendado, 'dd/MM/yyyy HH:mm', {zone: 'America/Sao_Paulo'}).plus({minutes: 60}).toISO() }}",
        "options": {
          "query": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}"
        }
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        -528,
        864
      ],
      "id": "643943b4-5212-4027-97b2-450ae25e92ad",
      "name": "Buscar Agendamento",
      "alwaysOutputData": true,
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "pv-if-02",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "notEmpty",
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
        -304,
        864
      ],
      "id": "b859edf7-c40c-49fe-a743-2ba356eaa07e",
      "name": "Buscar Para Cancelar"
    },
    {
      "parameters": {
        "operation": "delete",
        "calendar": {
          "__rl": true,
          "value": "={{ $('Configuracao Unidades').first().json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "eventId": "={{ $json.id }}",
        "options": {}
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        -80,
        768
      ],
      "id": "ffb8ed4c-1d2b-4ed5-9937-188ad4dd3cc2",
      "name": "Delete an event",
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Agendamento cancelado com sucesso! ✅\\nData: {{ $('Configuracao Unidades').first().json.data_agendada }}\\nHorário: {{ $('Configuracao Unidades').first().json.horario_agendado }}\\nUnidade: {{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}\",\n  \"status\": \"sucesso\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        144,
        768
      ],
      "id": "edca01f5-71f9-4d4f-978b-653052a4df5d",
      "name": "Respond: Cancelamento Feito"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Não encontrei nenhum agendamento seu para o dia {{ $('Configuracao Unidades').first().json.data_agendada }} às {{ $('Configuracao Unidades').first().json.horario_agendado }} na unidade {{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}. Poderia confirmar a data?\",\n  \"status\": \"nao_encontrado\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        -80,
        960
      ],
      "id": "757ac79e-2c28-4395-a420-f2744246ffe3",
      "name": "Respond to Webhook (Erro)"
    },
    {
      "parameters": {
        "operation": "getAll",
        "calendar": {
          "__rl": true,
          "value": "={{ $json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "returnAll": true,
        "timeMin": "={{ DateTime.fromISO($json.data_antiga_iso).minus({minutes: 1}).toISO() }}",
        "timeMax": "={{ DateTime.fromISO($json.data_antiga_iso).plus({minutes: 60}).toISO() }}",
        "options": {
          "query": "={{ $json.telefone_limpo }}"
        }
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        -528,
        1248
      ],
      "id": "13d98929-f8fe-46ff-bf69-8f3f361379cd",
      "name": "Buscar Agendamento Antigo",
      "alwaysOutputData": true,
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "// --- VERIFICAR SE AGENDAMENTO ANTIGO FOI ENCONTRADO ---\nconst item = $input.first().json;\nconst temId = !!(item && item.id && String(item.id).trim() !== '');\nreturn { json: { ...item, encontrado: temId } };"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        -304,
        1248
      ],
      "id": "8cc9d693-7514-482d-b860-7240c65798a9",
      "name": "Verficar antigo"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "pv-if-03",
              "leftValue": "={{ $json.encontrado }}",
              "rightValue": "true",
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
        -80,
        1248
      ],
      "id": "d7b34328-99ed-40e8-ad1d-8bc887033bc7",
      "name": "Achou o Antigo?"
    },
    {
      "parameters": {
        "operation": "getAll",
        "calendar": {
          "__rl": true,
          "value": "={{ $('Configuracao Unidades').first().json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "returnAll": true,
        "timeMin": "={{ DateTime.fromFormat($('Configuracao Unidades').first().json.data_agendada, 'dd/MM/yyyy', {zone: 'America/Sao_Paulo'}).minus({hours: 3}).toISO() }}",
        "timeMax": "={{ DateTime.fromFormat($('Configuracao Unidades').first().json.data_agendada, 'dd/MM/yyyy', {zone: 'America/Sao_Paulo'}).plus({days: 1}).toISO() }}",
        "options": {}
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        144,
        1152
      ],
      "id": "c49ca94d-c822-4193-9173-a736732901ea",
      "name": "Ler Agenda (Do NOVO dia)",
      "alwaysOutputData": true,
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "pv-if-04",
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
        592,
        1152
      ],
      "id": "f7f03761-974b-4d07-99d9-1734dce7b7d5",
      "name": "Novo Válido?"
    },
    {
      "parameters": {
        "operation": "delete",
        "calendar": {
          "__rl": true,
          "value": "={{ $('Configuracao Unidades').first().json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "eventId": "={{ $('Buscar Agendamento Antigo').first().json.id }}",
        "options": {}
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        816,
        1056
      ],
      "id": "264bf3da-7b5b-477f-b22a-7959274ab4b6",
      "name": "DELETAR PARA REMARCAR",
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "calendar": {
          "__rl": true,
          "value": "={{ $('Configuracao Unidades').first().json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "start": "={{ DateTime.fromFormat($('Configuracao Unidades').first().json.data_agendada + ' ' + $('Configuracao Unidades').first().json.horario_agendado, 'dd/MM/yyyy HH:mm', {zone: 'America/Sao_Paulo'}).toISO() }}",
        "end": "={{ DateTime.fromFormat($('Configuracao Unidades').first().json.data_agendada + ' ' + $('Configuracao Unidades').first().json.horario_agendado, 'dd/MM/yyyy HH:mm', {zone: 'America/Sao_Paulo'}).plus({minutes: $('Configuracao Unidades').first().json.config_agenda.duracao_servico}).toISO() }}",
        "additionalFields": {
          "summary": "={{ $('Configuracao Unidades').first().json.nome_paciente }} - {{ $('Configuracao Unidades').first().json.telefone_limpo }}"
        }
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        1040,
        1056
      ],
      "id": "e0dbca3e-d760-4204-a27b-796143a06586",
      "name": "REMARCAR",
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Agendamento remarcado com sucesso! 🔄\\n\\nEra dia: {{ DateTime.fromISO($('Buscar Agendamento Antigo').first().json.start.dateTime).toFormat('dd/MM HH:mm') }}\\n\\nFicou para: {{ $('Configuracao Unidades').first().json.data_agendada }} às {{ $('Configuracao Unidades').first().json.horario_agendado }}\\n🏥 Unidade: {{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}\",\n  \"status\": \"sucesso\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        1264,
        1056
      ],
      "id": "d7fe1cf1-9dcd-406c-8136-0023d85ce39b",
      "name": "Resp: Remarcado Sucesso"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Não encontrei nenhum agendamento seu no dia {{ DateTime.fromISO($('Configuracao Unidades').first().json.data_antiga_iso).toFormat('dd/MM') }} para remarcar. Poderia confirmar a data do agendamento atual?\",\n  \"status\": \"agendamento_nao_encontrado\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        144,
        1344
      ],
      "id": "2bfa0fab-2753-4f57-9261-78ab49ad88cd",
      "name": "Resp: Antigo Nao Encontrado"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Encontrei seu agendamento atual, mas não consegui mudar para o novo horário solicitado. Motivo: {{ $json.validacao.motivo }}.\",\n  \"status\": \"erro_validacao_novo\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        816,
        1248
      ],
      "id": "66c4af99-15b5-4503-956d-76332ab9f797",
      "name": "Resp: Novo Horario Ruim"
    },
    {
      "parameters": {
        "operation": "getAll",
        "calendar": {
          "__rl": true,
          "value": "={{ $('Configuracao Unidades').first().json.config_agenda.id_agenda }}",
          "mode": "id"
        },
        "limit": 1,
        "timeMin": "={{ $now.toISO() }}",
        "timeMax": "={{ $now.plus({days: 45}).toISO() }}",
        "options": {
          "orderBy": "startTime",
          "query": "={{ $('Configuracao Unidades').first().json.telefone_limpo }}",
          "recurringEventHandling": "expand"
        }
      },
      "type": "n8n-nodes-base.googleCalendar",
      "typeVersion": 1.3,
      "position": [
        -528,
        1632
      ],
      "id": "77ab219b-1585-4724-b18d-f8336b937106",
      "name": "Buscar Consulta Paciente",
      "alwaysOutputData": true,
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "5doIJLYeyKYlY4Ji",
          "name": "Google Calendar account"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "pv-if-05",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "notEmpty",
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
        -304,
        1632
      ],
      "id": "1d42fbb7-3d56-44ba-896b-1b3535610368",
      "name": "If1"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Sim! ✅ Encontrei seu agendamento para o dia {{ DateTime.fromISO($json.start.dateTime).toFormat('dd/MM') }} às {{ DateTime.fromISO($json.start.dateTime).toFormat('HH:mm') }} na unidade {{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}.\",\n  \"status\": \"encontrado\",\n  \"data_iso\": \"{{ $json.start.dateTime }}\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        -80,
        1536
      ],
      "id": "21cae963-cf69-4792-81ca-1df8e9cc2563",
      "name": "Resp: Encontrado"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\n  \"resultado\": \"Verifiquei aqui e não encontrei nenhum agendamento futuro no seu nome/telefone na unidade {{ $('Configuracao Unidades').first().json.config_agenda.nome_unidade }}. 🤔 Vamos agendar sua avaliação?\",\n  \"status\": \"nao_encontrado\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [
        -80,
        1728
      ],
      "id": "65fa9a7f-15c8-4b97-bff0-8695230d3f64",
      "name": "Resp: Nao Encontrado"
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
        144,
        192
      ],
      "id": "e7a47945-3c31-4cd5-8b53-3b7c99ccb50e",
      "name": "LOG VERIFICAR DISPONIB.",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
        592,
        384
      ],
      "id": "9546cd87-4d0e-48c3-bb9f-2a0076cb18c8",
      "name": "LOG SUCESSO AGENDAMENTO",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
        368,
        576
      ],
      "id": "aec6f432-32bf-429c-96f0-2e426fafac7b",
      "name": "LOG ERRO AGENDAR",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
              "fieldValue": "Cancelado pelo cliente via IA"
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
        368,
        768
      ],
      "id": "a9f26298-1316-44fe-879a-42bc5e94e4b5",
      "name": "Log Sucesso CANCELAMENTO",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
              "fieldValue": "Cliente tentou cancelar data inexistente"
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
        144,
        960
      ],
      "id": "8b2636ac-bb6b-4725-b602-7b7050dce082",
      "name": "LOG ERRO CANCELAR",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
              "fieldValue": "=Trocou de {{ DateTime.fromISO($('Buscar Agendamento Antigo').first().json.start.dateTime).toFormat('dd/MM HH:mm') }} PARA {{ $('Configuracao Unidades').first().json.data_agendada }} {{ $('Configuracao Unidades').first().json.horario_agendado }}"
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
        1488,
        1056
      ],
      "id": "04d3ef3d-981b-43a4-b04d-91dc6f4c4845",
      "name": "Log Sucesso Reagendamento",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
              "fieldValue": "=Cliente tentou alterar data {{ $('Configuracao Unidades').first().json.data_antiga_iso }} mas não existia."
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
        368,
        1344
      ],
      "id": "23721e15-fcfe-48f8-9db0-5bcd3f0c155c",
      "name": "LOG Log Erro Busca",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
              "fieldValue": "=Motivo: {{ $json.validacao.motivo }}"
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
        1040,
        1248
      ],
      "id": "f440dd58-aae0-422d-8ff6-73b05eee9376",
      "name": "LOG Log Erro Busca1",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
              "fieldValue": "=Paciente consultou: {{ DateTime.fromISO($json.start.dateTime).toFormat('dd/MM HH:mm') }}"
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
        144,
        1536
      ],
      "id": "4d02f1d2-e76c-4bd0-846c-5055773e18ae",
      "name": "Log Sucesso Verifica Agenda Paciente",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
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
              "fieldValue": "Nao tem avaliação marcada."
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
        144,
        1728
      ],
      "id": "5065da73-b6fa-4d64-8d28-500663f1e5a2",
      "name": "LOG Log Erro Busca2",
      "credentials": {
        "supabaseApi": {
          "id": "1I9LSC5dA1mD70Fv",
          "name": "ANDRE ( DASH CONTACT )"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const itemConfig = $('Configuracao Unidades').first();\nconst dadosOriginais = itemConfig.json;\nconst configAgenda = dadosOriginais.config_agenda;\n\nconst TIMEZONE = configAgenda.timezone || 'America/Sao_Paulo';\nconst DURACAO_MINUTOS = configAgenda.duracao_servico || 15;\nconst CAPACIDADE_MAXIMA = configAgenda.capacidade_simultanea || 2;\n\nconst eventosOcupados = $input.all().map(i => i.json);\n\nconst dataStr = dadosOriginais.data_agendada;\nconst horaStr = dadosOriginais.horario_agendado;\nconst dataAlvo = DateTime.fromFormat(`${dataStr} ${horaStr}`, 'dd/MM/yyyy HH:mm', { zone: TIMEZONE });\n\nlet validacao = { aprovado: false, motivo: '' };\nconst getMin = (cfg) => cfg.h * 60 + cfg.m;\n\nif (!dataAlvo.isValid) {\n    validacao.motivo = 'Data ou hora em formato inválido.';\n} else {\n    const diaSemana = dataAlvo.weekday;\n    const regraDia = configAgenda.regras_horario[diaSemana];\n    if (!regraDia) {\n        validacao.motivo = 'A clínica não abre neste dia da semana.';\n        validacao.aprovado = false;\n    } else {\n        const minSol = dataAlvo.hour * 60 + dataAlvo.minute;\n        const minFimSol = minSol + DURACAO_MINUTOS;\n        const pIni = getMin(regraDia.ini);\n        const pFim = getMin(regraDia.fim);\n        \n        if (minSol < pIni || minFimSol > pFim) {\n            validacao.motivo = 'Horário fora do expediente da clínica.';\n            validacao.aprovado = false;\n        } else {\n            const slotInicio = dataAlvo;\n            const slotFim = dataAlvo.plus({ minutes: DURACAO_MINUTOS });\n            let ocupados = 0;\n            for (const evento of eventosOcupados) {\n                if (!evento || !evento.start) continue;\n                if (evento.status === 'cancelled') continue;\n                let iniEvt = DateTime.fromISO(evento.start.dateTime || evento.start.date).setZone(TIMEZONE);\n                let fimEvt = DateTime.fromISO(evento.end.dateTime || evento.end.date).setZone(TIMEZONE);\n                if (slotInicio < fimEvt && slotFim > iniEvt) ocupados++;\n            }\n            if (ocupados < CAPACIDADE_MAXIMA) {\n                validacao.aprovado = true;\n                validacao.motivo = 'Sucesso';\n            } else {\n                validacao.aprovado = false;\n                validacao.motivo = 'Este horário já está ocupado.';\n            }\n        }\n    }\n}\n\nreturn { json: { ...dadosOriginais, validacao } };"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        368,
        1152
      ],
      "id": "da60ab0c-e68a-48d0-86d0-23262064b0a3",
      "name": "Validar Slot Remarcar"
    }
  ],
  "connections": {
    "AGENDAMENTO": {
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
            "node": "Guarda de Trânsito",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Guarda de Trânsito": {
      "main": [
        [
          {
            "node": "Ler Agenda (Check)",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Ler Agenda (Seguranca)",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Buscar Agendamento",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Buscar Agendamento Antigo",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Buscar Consulta Paciente",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Ler Agenda (Check)": {
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
            "node": "LOG VERIFICAR DISPONIB.",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Ler Agenda (Seguranca)": {
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
            "node": "If",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If": {
      "main": [
        [
          {
            "node": "AGENDAR PACIENTE",
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
    "AGENDAR PACIENTE": {
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
            "node": "LOG SUCESSO AGENDAMENTO",
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
            "node": "LOG ERRO AGENDAR",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Agendamento": {
      "main": [
        [
          {
            "node": "Buscar Para Cancelar",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Para Cancelar": {
      "main": [
        [
          {
            "node": "Delete an event",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Respond to Webhook (Erro)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Delete an event": {
      "main": [
        [
          {
            "node": "Respond: Cancelamento Feito",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Respond: Cancelamento Feito": {
      "main": [
        [
          {
            "node": "Log Sucesso CANCELAMENTO",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Respond to Webhook (Erro)": {
      "main": [
        [
          {
            "node": "LOG ERRO CANCELAR",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Agendamento Antigo": {
      "main": [
        [
          {
            "node": "Verficar antigo",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Verficar antigo": {
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
            "node": "Ler Agenda (Do NOVO dia)",
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
    "Ler Agenda (Do NOVO dia)": {
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
    "Novo Válido?": {
      "main": [
        [
          {
            "node": "DELETAR PARA REMARCAR",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Resp: Novo Horario Ruim",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "DELETAR PARA REMARCAR": {
      "main": [
        [
          {
            "node": "REMARCAR",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "REMARCAR": {
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
            "node": "Log Sucesso Reagendamento",
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
            "node": "LOG Log Erro Busca",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Novo Horario Ruim": {
      "main": [
        [
          {
            "node": "LOG Log Erro Busca1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Buscar Consulta Paciente": {
      "main": [
        [
          {
            "node": "If1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If1": {
      "main": [
        [
          {
            "node": "Resp: Encontrado",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Resp: Nao Encontrado",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Encontrado": {
      "main": [
        [
          {
            "node": "Log Sucesso Verifica Agenda Paciente",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Resp: Nao Encontrado": {
      "main": [
        [
          {
            "node": "LOG Log Erro Busca2",
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
            "node": "Novo Válido?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {
    "AGENDAMENTO": [
      {
        "action": "verificar_disponibilidade",
        "data_iso": "2026-04-25T00:00:00",
        "periodo_preferencia": "tarde"
      }
    ]
  },
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "d1a2ea4f12ae9ebd3132590ec74e61784d3b49e17967bcb70d511f83551a7c49"
  }
}