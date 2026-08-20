# Arquitetura de Arquivos e Padrões Globais (v3)

## Nomenclatura de Prefixos

| Clínica | Prefixo | Agente | Geração |
|---|---|---|---|
| Volta a Sorrir | `VAS_` | Morgana | v2 (legado) |
| Instituto Frazão | `IF_` / `IF2_` | Caliany / Etuane | v2 (legado) |
| Instituto Prime | `IP_` | Iara | v2 (legado) |
| HB Odontologia | `HB_` | Carol | v2 (legado) |
| FP Prime | `FP_` | Iasmin | v2 (legado) |
| Pedro Valença | `PV_` | Sofia | v2 (legado) |
| Prime Dente Meier | `PDM_` | Sophia | v2 (legado) |
| **OB Clinic (Joinville/SC)** | `OB_` | **Gi** | **v3 (referência)** |
| **Vassoler (Guarulhos/SP)** | `VA_` | **Karol** | **v3 (referência)** |

## Estrutura de Pastas por Clínica

```
[Clínica]/
├── briefing_[clinica].md           ← briefing de onboarding (raiz)
├── Configuracao/
│   ├── [PREFIX]_objetivo_agente.md
│   ├── [PREFIX]_regras_sistema_constraints.md
│   └── [PREFIX]_habilidades_tags_estrutura.md
├── Database/                        ← BK em CSV (na OB Clinic os CSVs ficam junto dos prompts)
│   ├── [PREFIX]_BK_estrutura.csv
│   ├── [PREFIX]_BK_feriados.csv
│   ├── [PREFIX]_BK_localizacao.csv
│   └── [PREFIX]_BK_objecoes.csv
├── Prompts [NomeAgente]/
│   ├── [PREFIX]_persona_[nome].md   ← novo na v3
│   └── [PREFIX]_estagio_0 a 12 .md
└── n8n/                             ← se houver integração de agenda
    ├── [WORKFLOW].json
    └── documentação do workflow .md
```

## Lista Completa de Arquivos por Agente (v3)

```
[PREFIX]_objetivo_agente.md
[PREFIX]_persona_[nome].md             ← identidade humanizada (ver diferenciais.md)
[PREFIX]_regras_sistema_constraints.md
[PREFIX]_habilidades_tags_estrutura.md
[PREFIX]_BK_localizacao.csv            ← BK agora em .csv (era .txt na v2)
[PREFIX]_BK_estrutura.csv
[PREFIX]_BK_objecoes.csv
[PREFIX]_BK_feriados.csv               ← NOVO na v3
[PREFIX]_estagio_0_recepcao.md             ← início do prompt (memória + campanha)
[PREFIX]_estagio_1_acolhimento_situacao.md
[PREFIX]_estagio_2_problema_implicacao.md
[PREFIX]_estagio_3_necessidade_convite.md
[PREFIX]_estagio_4_verificar_disponibilidade.md
[PREFIX]_estagio_5_agendamento_pacto_honra.md
[PREFIX]_estagio_6_retencao.md
[PREFIX]_estagio_7_verificacao.md
[PREFIX]_estagio_8_finalizacao.md
[PREFIX]_estagio_9_objecoes.md
[PREFIX]_estagio_10_bypass.md
[PREFIX]_estagio_11_memoria.md             ← final do prompt (regras de Salvar_Contexto)
[PREFIX]_estagio_12_reengajamento.md       ← follow-up proativo
```

**Arquivos da v2 descontinuados na v3:** `_perfil_empresa.md` (conteúdo migrou para `_BK_estrutura.csv` e o briefing), `_mensagem_boas_vindas.md` (migrou para o E0), `_db_*.txt` (viraram `_BK_*.csv`).

## Mapeamento de Estágios v2 → v3

| v2 | v3 |
|---|---|
| E1 Situação | E1 Acolhimento + Situação |
| E2 Problema + E3 Implicação | **E2 Problema + Implicação (fundidos)** |
| E4 Necessidade-Solução | E3 Necessidade + Convite |
| (parte do E5) | **E4 Verificar Disponibilidade (novo, dedicado)** |
| E5 Fechamento | E5 Agendamento + Pacto de Honra |
| E9 Dúvidas | E9 Objeções (dirigido pelo BK CSV) |
| E10 Agendamento Direto | E10 Bypass (3 tentativas progressivas) |

A Regra das 2 Afirmativas da v2 foi absorvida pelo fluxo linear v3: E2 faz UMA pergunta de implicação por perfil de dor e E3 já convida para a avaliação — o funil ficou mais curto por padrão.

## Estrutura Interna dos Arquivos de Estágio (blocos)

Todos os estágios usam as seções, nesta ordem:

```
# [Nome do Estágio] | [Agente] | [Clínica]

## #I — Intenção        ← o que o agente deve alcançar no estágio
## #D — Detalhes        ← identidade, scripts entre aspas (>), PASSO 1/2/3, variantes, cenários
## #A — Ações           ← habilidades a executar, quando, com quais parâmetros (tabelas)
## #P — Pré-requisitos  ← checklist "- [ ]" antes de avançar (opcional)
## #L — Limites         ← proibições com ❌ e justificativa
```

Convenções: scripts em blockquote (`> "..."`), regras críticas destacadas (`> CRÍTICO:` / `**REGRA CRÍTICA:**` / `⚠️`), exemplos de certo/errado com ✅/❌.

## Estrutura dos CSVs do BK

**`_BK_estrutura.csv` e `_BK_localizacao.csv`** — colunas `Tópico,Informação`:
```csv
Tópico,Informação
Endereço,"Rua Orestes Guimarães 828, Bairro América, Joinville/SC"
Referência,Em frente ao Hospital da Unimed
Maps,https://maps.app.goo.gl/...
```

**`_BK_objecoes.csv`** — colunas `Objeção,Gatilhos,Resposta` (8-9 tipos padrão):
```csv
Objeção,Gatilhos,Resposta
Preço / Não tenho condições,"é caro, não tenho condições, não posso pagar","[nome], entendo essa preocupação 💙 A gente facilita sim o pagamento..."
```
Tipos padrão: Preço, Medo/Trauma, Idade, Pergunta direta de preço/parcelamento, Distância, Adaptação ("me viro com dentadura"), Pergunta direta se tem custo, Indecisão ("vou pensar").

**`_BK_feriados.csv`** — colunas `Data,Feriado,Tipo` com os feriados nacionais do ano vigente (13 datas em 2026). Consultado obrigatoriamente no E4 antes de oferecer qualquer data. Se a data pedida for feriado:
> "[nome], esse dia é feriado e a clínica não abre 😊 Consigo te oferecer uma data próxima. Prefere antes ou depois?"

## Constraints — Seções Padrão

Todo arquivo de constraints deve ter:
1. Identidade e Natureza (resposta ao "você é robô?" com 🙋‍♀️)
2. Estilo de Comunicação (120 caracteres, fragmentação, escuta ativa específica)
3. Política de Avaliação (vocabulário: voucher / cortesia solidária / cortesia / gratuita / R$X)
4. Política Financeira (formas de pagamento — informar só se perguntado; nunca citar nº fixo de parcelas)
5. Filtros de Agendamento (idade mínima, dias fechados, feriados)
6. Regras de Agenda (duração da avaliação, pacientes por horário, encaixes, almoço)
7. Segurança Técnica — Anti-Alucinação (nunca inventar dados; basear-se no BK e nos retornos)
8. Localização e Horários
9. Gatilho de Transbordo (frase exata com nome da humana)
10. Formato do Telefone (DDI+DDD+Número)
11. Dados Obrigatórios para Agendamento (Nome Completo + Telefone [+ Bairro]; ❌ nascimento/e-mail/CPF)
12. Retenção — Regra Absoluta (3 tentativas)
13. Remarcação — Regras de Contexto e Persistência (resistência obrigatória, impedimento declarado, limite de 3 datas, não reperguntar dados da abertura)
+ seções específicas da clínica (campanha, dentistas com dias restritos, etc.)

## Habilidades/Tags — Seções do arquivo `_habilidades_tags_estrutura.md`

```
## #I — Intenção
## #D — Detalhes
   Habilidades de Agendamento (Acionar API) — tabela com parâmetros
   Habilidades de Contato
   Habilidade de Comprometimento
   Habilidades de Memória (Ler_Contexto, Salvar_Contexto, Registrar_Origem se campanha)
   Descrição da Habilidade Salvar_Contexto + tabela de campos semânticos + exemplo
   Momentos obrigatórios de Salvar_Contexto (toda transição + eventos)
## #A — Sequências de Execução Obrigatórias (agendamento, remarcação, cancelamento, escalações, finalização)
## #L — Tags do Sistema (evento, classificação, kanban) + Formato do Pacto de Honra
```

## Duplicação de Agente (dois nomes)

1. Construir o agente completo com o nome A
2. Duplicar todos os arquivos com novo prefixo
3. Substituir nome A por nome B com sed
4. Corrigir manualmente: linha de CRC deve ter **ambos** os nomes
5. Corrigir: nota de identidade deve mencionar ambos
6. **v3:** renomear também o campo de memória `[ÚLTIMA_MENSAGEM_<NOME>]` — na Vassoler o campo ficou `[ÚLTIMA_MENSAGEM_GI]` por herança do template da Gi; ao duplicar, padronizar com o nome do agente novo (e manter consistência entre E11, E12 e a descrição da habilidade)

Erro comum após substituição automática:
```
# ERRADO: CRC: Etuane e Etuane
# CORRETO: CRC: Caliany e Etuane
```

## Formato do Telefone

DDI + DDD + Número, sem caracteres especiais.
Exemplo: `5521999915601`

Se vier sem DDD:
> "Para registrar certinho, qual é o seu DDD? 😊"
