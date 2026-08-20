# Correções de Produção — Padrão Luna (v4)

Problemas reais observados em produção e como corrigi-los. Os problemas 1–11 vêm da v3 e continuam válidos — o comportamento do paciente não mudou porque o modelo mudou. Os problemas 12–17 são específicos da migração para o Luna.

Ao encontrar um problema novo, documentar em quatro partes: **sintoma** (o que o agente fez), **causa** (qual instrução faltou ou era ambígua), **correção no estágio**, **correção nas constraints**.

---

# Herdados da v3

## 1 — Agente ignora informação já dada na abertura

**Sintoma:** o paciente escreve "quero remarcar para quinta dia 26 às 10h" e o agente coleta tudo do zero, inclusive a data que ele já informou.
**Causa:** o E6 não tinha instrução de ler a abertura antes de perguntar.
**Correção no E6:**
> ⚠️ Antes de qualquer pergunta, ler a mensagem de abertura. Se o paciente já informou dados, confirmar: "Entendi que você quer remarcar para [data] às [horário] 😊 Só preciso confirmar uma coisa."

**Correção nas constraints:** seção 11 — proibido perguntar dado que o paciente já forneceu.

## 2 — Oferece horário de hoje depois de impedimento declarado

**Sintoma:** o paciente diz "estou em viagem" e o agente segue oferecendo "tenho 09h, 14h ou 17h hoje".
**Causa:** sem vaga na data pedida, o agente voltava ao primeiro slot disponível — que era hoje.
**Correção no E4/E6:**
> ⚠️ Se o paciente declarou qualquer impedimento para hoje, hoje sai permanentemente das opções neste atendimento.

**Correção nas constraints:** ❌ proibido oferecer horário do dia atual após impedimento declarado, mesmo sendo a única vaga.

## 3 — Loop infinito de datas sem vaga

**Sintoma:** data 1 sem vaga → agente sugere hoje → recusa → data 2 sem vaga → loop.
**Causa:** não havia limite de tentativas nem saída.
**Correção no E4/E6:**
> ⚠️ Após 3 datas diferentes sem vaga: `Salvar_Contexto` com `[ALERTA: 3 datas sem disponibilidade]` → "[Nome], não estou encontrando vaga nas datas que você precisa 😔" + "Vou chamar a [humana] para encontrar a melhor solução, tudo bem?" → `transferir_atendimento`.

## 4 — Finalização em bloco único

**Sintoma:** depois do agendamento, o agente manda endereço + estacionamento + Maps + detalhes numa mensagem só.
**Causa:** a regra de fragmentação não era respeitada no E8.
**Correção no E8:** cada informação em balão próprio, respeitando o limite do turno. Na v4 isso é regra de `_formatacao_mensagens.md`, com precedência sobre qualquer exemplo de estágio.

## 5 — Nome de profissional errado

**Sintoma:** clínica com dois profissionais e o agente sempre cita o mesmo nome.
**Causa:** nome hardcoded no estágio.
**Correção no E5 e E8:** usar `{{nome_profissional_sugerido}}`, retornado por `verificar_disponibilidade`. E o invariante 7: proibido citar qualquer nome de dentista antes do agendamento confirmado — "dentista responsável" até lá.

## 6 — Cancela sem retenção

**Sintoma:** o paciente diz "quero cancelar" e o agente já pede os dados e cancela.
**Causa:** as 3 tentativas não estavam numeradas explicitamente.
**Correção no E6:** três tentativas obrigatórias e numeradas, cada uma com abordagem diferente, todas oferecendo remarcação como alternativa. Só após a 3ª recusa o agente cancela.
**Regra de ouro:** nunca abrir com "Claro!" ou "Sem problema!".

## 7 — Foco excessivo no Raio-X

**Sintoma:** o agente cita o RX em quase toda mensagem, fazendo parecer que o objetivo da visita é o exame.
**Causa:** instrução de "avisar sobre o RX" no E3/E5.
**Correção:** tirar o RX da oferta principal. Só no E8, como cortesia. O convite é "o dentista responsável vai analisar seu caso pessoalmente".

## 8 — Aceite imediato de remarcação

**Sintoma:** "Claro, qual dia?" sem tentar salvar a vaga original.
**Causa:** E6 prestativo demais, ignorando o custo operacional da remarcação.
**Correção:** resistência obrigatória — ao menos uma tentativa de manter o horário ("o dentista responsável já deixou tudo separado para te receber...").

## 9 — Validação genérica robotizada

**Sintoma:** relatos emocionais respondidos com "Faz sentido", "Entendo", "Que legal".
**Causa:** os estágios pediam "validar" sem exigir especificidade.
**Correção nos estágios e na persona:** escuta ativa específica — toda validação cita algo concreto:
- ✅ "Poxa, evitar tirar foto no próprio casamento... isso pesa muito 😔"
- ❌ "Faz total sentido."

## 10 — Oferece data em feriado

**Sintoma:** agente oferece avaliação em feriado nacional; a agenda do sistema não bloqueia.
**Causa:** não havia fonte de feriados consultável.
**Correção:** `_BK_feriados.csv` (colunas `Data,Feriado,Tipo`) com feriados nacionais e municipais, consulta obrigatória no E4:
> "[nome], esse dia é feriado e a clínica não abre 😊 Consigo te oferecer uma data próxima. Prefere antes ou depois?"

## 11 — Memória narrativa pouco acionável

**Sintoma:** notas em texto corrido geravam resumos vagos; no retorno do lead o agente não sabia o que fazer, e repetia o follow-up anterior.
**Causa:** nota em parágrafo livre, sem campos obrigatórios.
**Correção:** campos semânticos rotulados obrigatórios, `[PRÓXIMA_AÇÃO]` nunca vaga, `[ÚLTIMA_MENSAGEM_*]` sempre atualizado. Ver `memoria.md`.

---

# Específicos da migração para o Luna

## 12 — Agente repergunta dado que está na conversa

**Sintoma:** o paciente informa o nome completo no E5, o agente aciona `Ler_Contexto` no início do estágio seguinte, o retorno da API ainda tem `[NOME_COMPLETO: pendente]`, e o agente pergunta de novo.
**Causa:** a v3 mandava reler o contexto como Passo 0 de cada estágio. O retorno da API é sempre mais antigo que a conversa, e o agente confiava nele em vez do que acabou de ler.
**Correção:** `Ler_Contexto` só em E0, E7 (se o atendimento começou nele) e E12. Remover "Passo 0" de todos os outros estágios.
**Correção nas constraints:** o histórico do atendimento em curso é a fonte mais atual. A memória lida no E0 vale para o que aconteceu em atendimentos **anteriores**.

## 13 — Agente confirma agendamento que não aconteceu

**Sintoma:** o agente diz "prontinho, está confirmado!" e o paciente aparece na clínica sem agendamento.
**Causa:** com a v3, a corrente `realizar_agendamento → tag_Agendou → Cliente Agendou - IA → Salvar_Contexto → E8` era longa, e o agente às vezes seguia para o E8 antes de processar o retorno.
**Correção na v4:** corrente de no máximo 4 elos, e o retorno de sucesso como pré-condição explícita do E8 (invariante 3). As tags saíram — quem registra é o n8n, que só é acionado pela confirmação real da Clinicorp.
**Efeito colateral positivo:** o agente não consegue mais marcar "agendou" sem que a Clinicorp confirme, porque não é mais ele que marca.

## 14 — Respostas empilhadas (o agente prolixo)

**Sintoma:** o atendimento parece verborrágico mesmo com cada balão dentro dos 120 caracteres. Cinco balões seguidos por turno.
**Causa:** a v3 limitava o tamanho do balão, não a quantidade por turno. O BK de objeções guardava três respostas em sequência e o agente entregava as três.
**Correção:** `_formatacao_mensagens.md` com limite de 2 balões por turno (3 com validação + conteúdo + avanço), exceções documentadas para blocos duros, e o `_BK_objecoes.csv` reescrito já na forma comprimida `conteúdo | avanço`.
**Origem:** identificado e corrigido primeiro na Atos (Fer), antes da v4 — virou padrão.

## 15 — Nenhuma etiqueta e nenhum card aparecem no CRM

**Sintoma:** o agente atende, agenda, tudo funciona, e o painel Kanban não registra nada.
**Causa:** as tags saíram do agente e o subsistema de CRM não estava montado, ou estava montado sem `id_atendimento` no payload.
**Correção:** `id_atendimento` obrigatório nas 5 habilidades de agendamento; subsistema de CRM como pré-requisito de onboarding (Etapa 1, item 10); teste de ponta a ponta antes de ativar. Ver `integracao-crm-cards.md`.
**Como diagnosticar:** se o agendamento chega na Clinicorp mas o card não move, é `id_atendimento`. Se nem na Clinicorp chega, é o workflow.

## 16 — Remarcação e cancelamento não marcam o contato

**Sintoma:** o painel mostra o card movido, mas o contato continua com a etiqueta antiga. Relatórios contam como agendado quem cancelou.
**Causa:** na v3 só a cadeia Agendar tinha node de etiqueta de contato — `tag_Remarcou` e `tag_Cancelou` eram do agente. Ao portar para a v4 sem adicionar os dois nós novos, essas etiquetas simplesmente deixam de existir.
**Correção:** adicionar `Tag Remarcou Contato (Remarcar)` e `Tag Cancelou Contato (Cancelar)`, com `remarcado_contact_tag_id` e `cancelado_contact_tag_id` na tabela `automacao_clinicas`. Ver `integracao-crm-cards.md`.
**É o erro mais provável de uma migração v3 → v4.** Está no checklist da Etapa 6.

## 17 — Mensagem soando a script colado

**Sintoma:** leads em situações muito diferentes recebem exatamente a mesma frase, palavra por palavra. Fica evidente quando dois prints de conversas diferentes são comparados.
**Causa:** a v3 escrevia scripts em blockquote para o modelo reproduzir. O Luna reproduz literalmente, e reproduzir literalmente é o problema.
**Correção:** rotular todo bloco de mensagem como **referência de tom** (o agente parafraseia) ou **bloco duro** (sai literal). Blocos duros são só cinco: Pacto de Honra, confirmação visual do E8, endereço vindo do CSV, frase de transbordo e resposta ao "você é robô?". Ver `redacao-luna.md`, item 3.

## 18 — Agente hesita entre estágios

**Sintoma:** o paciente pede para cancelar durante o SPIN e o agente responde algo intermediário, sem entrar de fato no E6 nem continuar o funil.
**Causa:** a v3 tinha regras de desvio espalhadas por estágio, às vezes divergentes entre si. O modelo tinha várias instruções aplicáveis ao mesmo momento.
**Correção:** uma única regra de trânsito, declarada no E0 e nas constraints (ver `estagios.md`), e nenhuma tabela de desvio dentro dos estágios.

## 19 — SPIN comprimido demais, avaliação oferecida cedo demais

**Sintoma:** o lead verbaliza a dor no E1, e em 2-3 trocas de mensagem o agente já está oferecendo a avaliação — sem aprofundar situação nem dar espaço pro lead se abrir. Testado com lead "engajado" (respostas elaboradas) e com lead "frio" (respostas monossilábicas: "sim", "não", "dor") — em ambos os casos o funil chegou rápido demais na oferta, e o comportamento se repetiu trocando de modelo (não é característica de um LLM específico).

**Causa:** o E2 manda fazer **uma** pergunta de implicação e, na resposta, "validar e avançar do mesmo jeito, sem insistir" — sem nenhuma condição pra aprofundar quando a resposta deixa material na mesa. O E3 faz a validação da implicação e a pergunta de projeção na mesma resposta, sem separação de turno. E o E1, quando a dor aparece (seja na abertura ou como resposta à própria pergunta do E1), vai direto pro E2 sem nenhuma pergunta de situação (há quanto tempo, frequência). O SPIN clássico tem 4 momentos (Situação, Problema, Implicação, Necessidade); essa compressão condensou tudo em 2 trocas de mensagem — funcionava na v3/GPT-4.1 porque os estágios lá tinham mais perguntas explícitas; na v4, a compressão foi longe demais.

**Correção:**
- **E1:** depois que a dor aparecer (por qualquer via), fazer uma pergunta de situação (há quanto tempo/frequência) num turno separado, antes de ir pro E2.
- **E2:** distinguir resposta curta **isolada** (validar e avançar, sem insistir — comportamento mantido) de **padrão de engajamento baixo** (2+ respostas seguidas sem elaboração espontânea, qualquer que seja a palavra usada) — nesse padrão, dar um turno de acolhimento sem pergunta nova antes do E3.
- **E3:** juntar validação e projeção é o padrão quando o lead está engajado; separar em turnos diferentes é a **exceção**, reservada só pro padrão de engajamento baixo do E2 (ver correção abaixo — a primeira versão desta regra errou aqui).

**Por que escrever o "padrão de engajamento baixo" como sinal comportamental, não como lista de palavras:** ver `redacao-luna.md`, item 4 ("proibição sem motivo não generaliza"). Uma regra do tipo "se disser 'sim', 'não' ou 'ok'..." só pega correspondência literal — "blz", "pode ser", um emoji sozinho ficam de fora. Escrever o *padrão* (mensagem curta, sem elaboração espontânea, repetido) faz o modelo generalizar pra qualquer forma equivalente.

**Como testar:** simular duas conversas variando a forma da resposta fria (não repetir as mesmas palavras do exemplo do prompt) — se o comportamento de desacelerar aparecer nas duas sem ter sido literalmente previsto, o modelo generalizou pelo conceito. Se só aparecer quando a palavra bate com o exemplo, a regra foi escrita como lista fechada e precisa ser reescrita como sinal comportamental.

### 19b — Correção da correção: "sempre separar validação de projeção" quebrou a proatividade

**Sintoma:** num teste seguinte, com um lead que começou frio mas foi engajando progressivamente ("ontem" → "vai e vem" → "algumas coisas sim" → "alguns evitei"), o agente validou a última resposta **sem** fazer a pergunta de projeção junto, esperou um "sim" do lead que não carregava informação nenhuma, e só depois ofereceu a projeção. Ritmo mais lento que o necessário, e o "sim" parecia fricção, não cuidado.

**Causa:** a primeira versão da correção acima escreveu a separação de turno (validação do E2 / projeção do E3) como regra **universal**, sem condicionar ao padrão de engajamento baixo. Isso tratou o sintoma errado: o problema original (item 19) nunca foi juntar validação e projeção no mesmo balão — foi chegar na implicação sem profundidade de situação antes. Uma vez que o E1 ganhou o turno de situação e o E2 ganhou a distinção de engajamento, a separação de turno virou um remendo sem função, ativo até pra lead engajado.

**Correção:** a separação de turno em E3 só se aplica quando o E2 identificar padrão de engajamento baixo — nesse caso, o turno de acolhimento **do próprio E2** já cobre o espaço, e a projeção do E3 vem depois dele. Pra lead engajado (elaborando algo por conta própria, mesmo pouco), juntar validação e projeção no mesmo balão é o padrão esperado, não uma falha.

**Lição pra próximas correções:** ao corrigir "funil rushado", checar se a causa é falta de profundidade (turnos insuficientes) ou separação forçada (turnos demais no lugar errado) antes de escolher entre "adicionar pergunta" e "adicionar pausa" — são remédios diferentes pra sintomas parecidos, e o errado piora o problema oposto.
