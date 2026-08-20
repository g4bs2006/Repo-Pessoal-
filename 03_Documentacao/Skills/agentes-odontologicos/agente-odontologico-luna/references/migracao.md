# Migração v3 → Luna (v4)

Roteiro para converter um agente existente. Feito na ordem abaixo, a migração é mecânica em quase todo o caminho — o único trecho que exige decisão é o passo 0.

Tempo típico: uma clínica com os 17 arquivos da v3 leva cerca de 2 horas, das quais a maior parte é o n8n.

---

## Passo 0 — Decidir antes de mexer em arquivo

Três perguntas ao usuário. Nenhuma delas se resolve lendo o repositório:

1. **A clínica tem painel de CRM na Helena, com linha em `automacao_clinicas`?**
   Se **não**, a migração não deve começar. Sem o subsistema de CRM, tirar as tags do agente significa perder o registro por completo. Opções: montar o painel primeiro, aceitar rodar sem etiqueta e card, ou manter esta clínica na v3.
2. **As etiquetas de remarcação e cancelamento existem na Helena?**
   Se não existem, criar antes — e pegar os IDs para `remarcado_contact_tag_id` e `cancelado_contact_tag_id`.
3. **A clínica quer o alerta de transbordo visível como etiqueta no painel?**
   Se sim, `tag_Alerta` é a única reintrodução aceitável (ver `habilidades.md`, seção 5). Se não, o alerta vive no campo `[ALERTA]` da nota.

---

## Passo 1 — Snapshot

Arquivar a versão v3 antes de qualquer edição, no padrão do repositório:

```bash
cd "01_Clinicas/[Letra]/[Clínica]"
mkdir -p Arquivado/v3_$(date +%Y-%m-%d)
cp -r Configuracao Database Estagios Arquivado/v3_$(date +%Y-%m-%d)/
```

O snapshot serve para comparar comportamento em produção depois. Manter até o agente Luna rodar duas semanas sem incidente.

---

## Passo 2 — Arquivos de configuração

| Ação | Arquivo |
|---|---|
| **Mesclar e apagar** | `_objetivo_agente.md` → conteúdo vai para a seção 1 da persona; apagar o original |
| **Criar** | `_formatacao_mensagens.md` — base pronta em `redacao-luna.md`, seção de formatação. Adaptar o emoji de coração e o nome do agente |
| **Renomear e limpar** | `_habilidades_tags_estrutura.md` → `_habilidades_estrutura.md`. Apagar as seções de tags, `Registrar_Origem` e `Confirmar_Compromisso_Honra`. Reescrever as descrições no padrão de `habilidades.md` |
| **Reescrever o topo** | `_regras_sistema_constraints.md` — adicionar a cadeia de precedência e os 12 invariantes literais no início. Remover do corpo o que virou responsabilidade da formatação |
| **Enxugar** | `_persona_[nome].md` — adicionar a seção 6 (permissões explícitas) se não existir; garantir que a tabela do "o que eu não faço" tem o **motivo** em cada linha |

---

## Passo 3 — CSVs do BK

Só o `_BK_objecoes.csv` muda: a coluna `Resposta` passa a ser a versão comprimida de dois balões, com ` | ` separando conteúdo e avanço.

```csv
# antes (v3) — três frases que o agente entregava empilhadas
Avaliação tem custo?,"é gratuita?, tem custo?","[nome], a avaliação não tem custo! 😊 É um horário reservado exclusivamente para você, onde o especialista analisa seu caso e indica a melhor solução. Posso ver um horário disponível pra você?"

# depois (v4) — dois balões
Avaliação tem custo?,"é gratuita?, tem custo?","[nome], a avaliação não tem custo! 😊 É um horário reservado pro especialista analisar seu caso. | Posso ver um horário disponível pra você?"
```

Se a clínica quiser guardar a versão longa, criar a coluna `Detalhe` e usá-la só quando o paciente pedir mais informação. Os outros três CSVs ficam como estão — conferir só se o `_BK_feriados.csv` está no ano corrente.

---

## Passo 4 — Estágios

A maior parte da migração. Cinco varreduras, na ordem:

### 4.1 — Remover `Ler_Contexto` de 10 estágios

Apagar o bloco "Passo 0: acionar `Ler_Contexto`" de E1, E2, E3, E4, E5, E6, E8, E9, E10, E11. Manter em E0, E7 (com a condição "só se o atendimento começou aqui") e E12.

```bash
grep -ln 'Ler_Contexto' Estagios/*.md   # deve sobrar só 0, 7 e 12
```

Onde o Passo 0 era usado para justificar uma decisão ("verificar `[DOR]` antes de personalizar"), trocar por uma frase que aponta para a conversa: *"personalizar usando a dor e as frases que o paciente já usou nesta conversa"*.

### 4.2 — Remover tags e kanban de todas as sequências

```bash
grep -nE 'tag_|Cliente Agendou|Marcar_Dor|Classificar_Urgencia|Registrar_Origem|Confirmar_Compromisso' Estagios/*.md
```

Cada ocorrência tem destino conhecido — ver a tabela da seção 5 de `habilidades.md`. As sequências ficam:

```
antes: verificar_disponibilidade → Pacto → Sim → Confirmar_Compromisso_Honra
       → realizar_agendamento → tag_Agendou → Cliente Agendou - IA → Salvar_Contexto → E8
depois: verificar_disponibilidade → Pacto → Sim → realizar_agendamento
       → [sucesso] → Salvar_Contexto → E8
```

### 4.3 — Reduzir `Salvar_Contexto` aos 6 eventos

Apagar as chamadas de transição ("`Salvar_Contexto` ao avançar para o E3"). Manter só nos 6 eventos, mais o pré-transbordo com `[ALERTA]`.

```bash
grep -c 'Salvar_Contexto' Estagios/*.md
# esperado: E5, E6, E8, E9, E10, E12 com 1 ou 2. Os demais com 0
```

### 4.4 — Tirar as regras globais de dentro dos estágios

```bash
grep -niE '120 caracteres|travessão|reticências|2 emojis|nunca revelar que é IA|nunca.*grátis' Estagios/*.md
```

Tudo isso pertence a constraints, formatação ou persona. Apagar do estágio — não reescrever, apagar. A regra continua valendo porque está no arquivo dono dela.

### 4.5 — Rotular os blocos de mensagem

Percorrer cada blockquote de mensagem e marcar: **referência de tom** ou **bloco duro**. Só cinco são duros (Pacto, confirmação do E8, endereço do CSV, frase de transbordo, resposta ao "você é robô?"). Todo o resto é tom.

Aproveitar a passagem para apagar as tabelas de desvio estágio-a-estágio e colocar a regra única de trânsito no E0 (texto em `estagios.md`).

---

## Passo 5 — n8n

1. Capturar `id_atendimento` no `Configuracao Unidades` (4 aliases) e fixar `helena_company_id`.
2. Adicionar `id_atendimento` no payload das 5 habilidades no WTS. **Este é o passo mais fácil de esquecer e o mais caro.**
3. Adicionar `remarcado_contact_tag_id` e `cancelado_contact_tag_id` na linha de `automacao_clinicas`.
4. Adicionar os nós `Tag Remarcou Contato (Remarcar)` e `Tag Cancelou Contato (Cancelar)`, espelhando o de Agendar.
5. Validar o JSON com o script de `integracao-crm-cards.md`, passo 7.

---

## Passo 6 — Verificação estática

Os quatro comandos de `arquitetura.md`, seção final. Todos devem voltar limpos.

Mais um, de orçamento — o prompt consolidado deve ficar abaixo de 60% do tamanho da v3:

```bash
# tamanho da v3 arquivada vs. a v4 atual
find Arquivado/v3_*/  -name '*.md' | xargs wc -c | tail -1
find Configuracao Estagios -name '*.md' | xargs wc -c | tail -1
```

Se a redução for menor que 40%, provavelmente sobrou regra global duplicada dentro dos estágios (passo 4.4) ou tabela de desvio (passo 4.5).

---

## Passo 7 — Teste funcional antes de ativar

| # | Teste | O que conferir |
|---|---|---|
| 1 | Paciente novo → SPIN → agendar | Card criado, contato etiquetado, agendamento na Clinicorp |
| 2 | Paciente que volta (contato com nota) | Abre pelo Caminho B, não repergunta o nome, retoma pela `[PRÓXIMA_AÇÃO]` |
| 3 | Paciente agendado que volta | Abre pelo Caminho A, não reinicia o SPIN |
| 4 | Pedir remarcação | Resistência acontece 1× antes de abrir a agenda; card e etiqueta atualizados |
| 5 | Pedir cancelamento | As 3 tentativas acontecem; card vai para `cancelado_step_id`; contato etiquetado |
| 6 | "Quero marcar" na 1ª mensagem | 3 tentativas de SPIN, então bypass |
| 7 | Objeção de preço | Resposta em 2 balões, não 3 |
| 8 | Pedir data em feriado | Recusa com alternativa |
| 9 | 3 datas sem vaga | Transbordo com `[ALERTA]` gravado antes da frase |
| 10 | Erro forçado em `realizar_agendamento` | Probleminha técnico + transbordo, sem confirmar agendamento |
| 11 | "Você é robô?" | Resposta com 🙋‍♀️, sem admitir IA |
| 12 | Contagem de balões em 5 turnos aleatórios | Nenhum turno acima de 2 (ou 3 justificados) |

Os testes 4, 5 e 12 são os que mais pegam problema de migração — respectivamente os problemas 16, 16 e 14 de `correcoes.md`.

---

## Passo 8 — Registrar

1. Marcar a clínica como **v4** na tabela de prefixos de `arquitetura.md`.
2. Se algo novo apareceu durante a migração, documentar em `correcoes.md` no formato de quatro partes.
3. Commitar. O snapshot da v3 fica em `Arquivado/` por pelo menos duas semanas.
