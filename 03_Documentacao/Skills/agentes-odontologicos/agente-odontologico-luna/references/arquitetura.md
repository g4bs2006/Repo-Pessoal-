# Arquitetura de Arquivos — Padrão Luna (v4)

## Nomenclatura de prefixos

Cada clínica tem um prefixo curto em maiúsculas. Agentes duplicados na mesma clínica recebem sufixo numérico (`IF_`, `IF2_`).

| Clínica | Prefixo | Agente | Geração |
|---|---|---|---|
| OB Clinic (Joinville/SC) | `OB_` | Gi | v3 |
| Vassoler (Guarulhos/SP) | `VA_` | Karol | v3 |
| Atos Odontologia (Jundiaí/SP) | `ATO_` | Fer | v3 + formatação |
| Yamar | `YAMAR_` | Angela | v3 |
| Scopel Odontologia (Pontal do Paraná/PR) | `SCO_` | Clarisse | **v4** |
| Volta a Sorrir · Instituto Frazão · Instituto Prime · HB · FP Prime · Pedro Valença · Prime Dente Meier · Conquista Sorrisos | `VAS_` `IF_`/`IF2_` `IP_` `HB_` `FP_` `PV_` `PDM_` `CS_` | — | v2 (legado) |

Ao criar o primeiro agente Luna, registrar aqui com a geração **v4** — a tabela é o índice de qual clínica roda qual padrão, e isso decide qual skill usar na manutenção.

## Estrutura de pastas por clínica

```
01_Clinicas/[Letra]/[Clínica]/
├── briefing_[clinica].md
├── Configuracao/
│   ├── [PREFIX]_persona_[nome].md
│   ├── [PREFIX]_regras_sistema_constraints.md
│   ├── [PREFIX]_formatacao_mensagens.md
│   └── [PREFIX]_habilidades_estrutura.md
├── Database/
│   ├── [PREFIX]_BK_estrutura.csv
│   ├── [PREFIX]_BK_feriados.csv
│   ├── [PREFIX]_BK_localizacao.csv
│   └── [PREFIX]_BK_objecoes.csv
├── Estagios/
│   └── [PREFIX]_estagio_0 a 12 .md
└── n8n/
    ├── agendamento_[clinica].json
    └── documentação do workflow .md
```

## Lista completa de arquivos (v4)

```
[PREFIX]_persona_[nome].md
[PREFIX]_regras_sistema_constraints.md
[PREFIX]_formatacao_mensagens.md
[PREFIX]_habilidades_estrutura.md
[PREFIX]_BK_localizacao.csv
[PREFIX]_BK_estrutura.csv
[PREFIX]_BK_objecoes.csv
[PREFIX]_BK_feriados.csv
[PREFIX]_estagio_0_recepcao.md               ← início do prompt
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
[PREFIX]_estagio_11_memoria.md               ← final do prompt
[PREFIX]_estagio_12_reengajamento.md
```

**Mudanças de inventário em relação à v3:**

| Arquivo | Status na v4 |
|---|---|
| `_objetivo_agente.md` | **removido** — absorvido pela persona. Objetivo e identidade em dois arquivos geravam duas versões da mesma frase |
| `_formatacao_mensagens.md` | **novo e obrigatório** — nasceu na Atos como correção de produção e virou padrão |
| `_habilidades_tags_estrutura.md` | **renomeado** para `_habilidades_estrutura.md` — não há mais seção de tags |
| `_perfil_empresa.md`, `_mensagem_boas_vindas.md`, `_db_*.txt` | descontinuados desde a v3 |

## Ordem de montagem do prompt no WTS

```
1. [PREFIX]_persona_[nome].md
2. [PREFIX]_regras_sistema_constraints.md
3. [PREFIX]_formatacao_mensagens.md
4. [PREFIX]_habilidades_estrutura.md
5. [PREFIX]_estagio_0_recepcao.md
6. ... estágios 1 a 10 ...
7. [PREFIX]_estagio_12_reengajamento.md
8. [PREFIX]_estagio_11_memoria.md            ← sempre por último
```

A ordem espelha a cadeia de precedência (`redacao-luna.md`, item 1): o que manda vem primeiro, o que é situacional vem depois. E11 fecha porque é regra de escrita da nota, não de conversa.

## Estrutura interna dos arquivos de estágio

```
# [Nome do Estágio] | [Agente] | [Clínica]

## #I — Intenção        ← o objetivo do estágio, em 2 ou 3 frases
## #D — Detalhes        ← perguntas, variantes, cenários, blocos de mensagem rotulados
## #A — Ações           ← habilidades com pré-condição e o que fazer com o retorno
## #P — Pré-requisitos  ← checklist "- [ ]" antes de avançar (opcional)
## #L — Limites         ← proibições no formato "❌ o que — por que — em vez disso"
```

Convenções:
- Bloco de mensagem em blockquote, sempre rotulado como **referência de tom** ou **bloco duro**
- Regra crítica destacada com `> ⚠️`
- Exemplos com ✅ / ❌ e **o motivo** ao lado
- Nada de regra global repetida — se vale em mais de um estágio, o lugar dela é constraints ou formatação

## Estrutura dos CSVs do BK

**`_BK_estrutura.csv` e `_BK_localizacao.csv`** — colunas `Tópico,Informação`:
```csv
Tópico,Informação
Endereço,"Rua Orestes Guimarães 828, Bairro América, Joinville/SC"
Referência,Em frente ao Hospital da Unimed
Maps,https://maps.app.goo.gl/...
Estacionamento,Convênio com o estacionamento ao lado
```

**`_BK_objecoes.csv`** — colunas `Objeção,Gatilhos,Resposta`:
```csv
Objeção,Gatilhos,Resposta
Preço / Não tenho condições,"é caro, não tenho condições, não posso pagar","[nome], entendo essa preocupação 💙 A gente facilita o pagamento e tudo é explicado com calma na avaliação. | Posso reservar seu horário?"
```

> Na v4, escrever a coluna `Resposta` **já na forma comprimida**, com ` | ` separando o balão de conteúdo do balão de avanço. A v3 guardava três frases em sequência e o agente as entregava empilhadas — era a causa raiz do atendimento prolixo. O conteúdo longo, se a clínica quiser mantê-lo, vai numa coluna extra `Detalhe` usada só quando o paciente pede mais.

Tipos padrão de objeção: Preço, Medo/Trauma, Idade, Pergunta direta de preço ou parcelamento, Distância, Adaptação ("me viro com dentadura"), "Tem custo?", Indecisão ("vou pensar"), Rispidez.

**`_BK_feriados.csv`** — colunas `Data,Feriado,Tipo`, com os feriados nacionais do ano vigente mais os municipais da cidade da clínica. Consulta obrigatória no E4 antes de oferecer qualquer data. Atualizar na virada do ano.

## Formato do telefone

DDI + DDD + número, só dígitos: `5521999915601`. Sem DDD:
> "Para registrar certinho, qual é o seu DDD? 😊"

## Duplicação de agente (dois nomes na mesma clínica)

1. Construir o agente completo com o nome A
2. Duplicar todos os arquivos com o novo prefixo
3. Substituir nome A por nome B (`sed`)
4. Corrigir à mão o que a substituição estraga:
   - a linha de CRC precisa ter **ambos** os nomes: `CRC: Caliany e Etuane`, nunca `CRC: Etuane e Etuane`
   - a nota de identidade deve mencionar os dois agentes
   - o campo de memória `[ÚLTIMA_MENSAGEM_<NOME>]` precisa virar o nome do agente novo — e ficar consistente entre E11, E12 e a descrição da habilidade. Herdar o nome do agente do template é o erro clássico (na Vassoler o campo ficou `[ÚLTIMA_MENSAGEM_GI]`, herdado da Gi)
   - o emoji de coração da marca, se os agentes representam unidades com identidade visual diferente
5. Conferir que o webhook n8n de cada agente aponta para o path certo

## Checklist de conformidade v4

Rodar antes de considerar o agente pronto:

```bash
# 1. Nenhuma habilidade removida sobrou
grep -rniE 'tag_|Registrar_Origem|Confirmar_Compromisso_Honra|Cliente Agendou|Marcar_Dor|Classificar_Urgencia' Configuracao/ Estagios/

# 2. Ler_Contexto só em E0, E7 e E12
grep -rln 'Ler_Contexto' Estagios/

# 3. Salvar_Contexto só onde deve estar
grep -rc 'Salvar_Contexto' Estagios/*.md

# 4. Regra global vazando para dentro dos estágios
grep -rniE '120 caracteres|travessão|máximo 2 emojis' Estagios/
```

Os quatro devem voltar limpos: o 1º sem nenhuma linha, o 2º só com E0/E7/E12, o 3º só com os estágios dos 6 eventos, o 4º sem nenhuma linha.
