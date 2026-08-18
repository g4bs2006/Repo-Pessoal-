# Templates de Comentário por Tipo de Trabalho

## Regras de Formatação

- Sempre começar com o prefixo `[SEÇÃO]` em maiúsculas (ex: `[MAPEAMENTO INICIAL]`)
- Data no formato `DD/MM/AAAA`
- Sem emojis — nem no cabeçalho, nem no corpo, nem nos bullets
- Listas com `-` (nunca com `*`)
- Máximo 30 linhas por comentário
- Não inventar deliverables — só o que foi realmente feito

---

## Template 1 — Construção Inicial de Agente

```
[MAPEAMENTO INICIAL]

🔧 [DD/MM/AAAA] — Construção do Agente: [NOME DO AGENTE/PRODUTO]

Tipo: [Agente SDR do Zero (v3) | Campanha | Configuração]
Arquivo base: [path relativo do diretório principal]
Agente(s): [nome da persona] (CRC)
Responsável técnico: [dentista/clínica]

Entregáveis:
- [N] arquivos criados em [caminho]
- Configuração: objetivo, regras, habilidades, tags
- Database: [lista dos CSVs criados]
- Estágios: [range] ([quantidade] arquivos)
- [detalhe extra se houver]

Decisões tomadas:
- [decisão 1]
- [decisão 2]

Próximos passos:
- [ação 1]
- [ação 2]
```

**Exemplo preenchido:**

```
[MAPEAMENTO INICIAL]

🔧 23/06/2026 — Construção dos Agentes: Oral Concept Tirol + Oral Conceito Nova Esperança

Tipo: Agente SDR do Zero (v3) — 2 agentes separados
Arquivo base: 01_Clinicas/2026-06 - Junho/Oral Concept/
Agentes: Haline (CRC) — OC_ e OCO_
Responsáveis: Dr. Agrício (OC_) | Dra. Letícia (OCO_)

Entregáveis:
- 42 arquivos criados no total (21 por agente)
- OC_: Configuracao (3), Database (4 CSVs), Prompts Haline (14 estágios E0-E12)
- OCO_: Configuracao (3), Database (4 CSVs), Prompts Haline (14 estágios E0-E12)

Decisões tomadas:
- Avaliação = "Cortesia da clínica" (nunca "grátis")
- Sem convênios (flag convenios_aceita = "nao")
- OC_ tecnologia: Scanner intraoral + Tomografia
- OCO_ tecnologia: Raio-X panorâmico próprio
- Regra linguagem simples exclusiva do OCO_

Próximos passos:
- Configurar na WTS (WhatsApp)
- Testar fluxo E0 → E8 em ambiente de homologação
```

---

## Template 2 — Manutenção / Bug / Mudança

```
[DEMANDAS]

🛠 [DD/MM/AAAA] — [Correção | Ajuste | Nova demanda]: [descrição curta]

Tipo: [Bug | Mudança solicitada | Expansão de funcionalidade]
Arquivo(s) afetado(s):
- [path/arquivo.md] — [o que mudou]

Contexto:
[1-2 frases explicando o porquê da mudança]

O que foi feito:
- [ação 1]
- [ação 2]

Impacto:
[O que muda no comportamento do agente/sistema]
```

---

## Template 3 — Feedback / Sucesso

```
[SUCESSO]

✅ [DD/MM/AAAA] — [Tipo de resultado]: [descrição curta]

Fonte: [cliente | operador | dado mensurado]

Resultado:
[Descrição do resultado positivo]

Contexto:
[O que levou a esse resultado — o que foi implementado antes disso]
```

---

## Template 4 — Dados Técnicos

```
[DADOS]

🔐 [DD/MM/AAAA] — [Tipo de dado]: [descrição curta]

[Label]: [valor ou referência]
[Label]: [valor ou referência]

Obs: [qualquer contexto relevante para o uso desse dado]
```

---

## Comentário para Sessões com Múltiplos Tipos

Para sessões que cobrem mais de um tipo, usar comentários separados com prefixos distintos:

```
[MAPEAMENTO INICIAL]
🔧 23/06/2026 — Construção...
[conteúdo do mapeamento]

---

[DADOS]
🔐 23/06/2026 — Token API Helena configurado
Token: [ref. para onde está salvo — nunca expor credencial raw em comentário ClickUp]
```
