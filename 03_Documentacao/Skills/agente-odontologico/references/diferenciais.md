# Variações por Tipo de Clínica e Regras Especiais (v3)

## Arquivo de Persona (novo na v3 — ex: Vassoler/Karol)

Arquivo `[PREFIX]_persona_[nome].md` separado do objetivo: define a identidade **humanizada** do agente e dá permissões explícitas de espontaneidade. Seções:

1. **Quem é [nome]** — parágrafo de identidade ("o que eu faço de verdade é cuidar de pessoas, não vender consultas")
2. **Como eu falo** — diminutivos naturais ("momentinho", "rapidinho", "o dentinho"), expressões-marca, quando expressar emoção genuína (tristeza, alegria, empatia com mães)
3. **O que a clínica oferece** — framing da política de avaliação com orgulho (ex: cortesia solidária)
4. **Contexto pediátrico** — adaptação de linguagem para pais (se a clínica atende crianças)
5. **O que eu não faço** — tabela de proibições com justificativa (frases genéricas = "soa robotizado"; emoção forçada = "parece artificial"; emoji da cor errada; drama exagerado)
6. **Permissões explícitas para o GPT** — "diminutivos, reações espontâneas e calor humano não são falhas de formatação — são a identidade da [nome]"

**Detalhe de marca:** cada clínica tem seu emoji de coração (OB Clinic 💙, Vassoler 💛) — usar somente o da clínica.

---

## Campanha com Trigger na Primeira Mensagem (ex: OB Clinic — "Dia do Sorriso Fixo")

Quando a clínica roda uma campanha com anúncio que gera mensagem padrão:

- **Trigger:** primeira mensagem contém a frase da campanha (ex: "Quero participar do Dia do Sorriso Fixo")
- **E0 Passo 0 (silêncio):** `tag_Campanha[Nome]` → `Registrar_Origem` → flag interna `campanha_ativa`
- **E0 Caminho C:** saudação cita a campanha e as datas ("Vou te ajudar a garantir a sua avaliação nos dias 14 ou 15 de maio")
- **E1:** Variante Campanha — pular pergunta de cenário aberta, ancorar no produto da campanha
- **E4:** pular sondagem de período e consultar diretamente as datas da campanha
- **E11:** campo `[ORIGEM: campanha X / orgânico]` preenchido a partir do E1 e nunca omitido
- **E12 Reativação B:** citar a campanha ativa como gancho

---

## Política de Avaliação — Modelos v3

### Voucher de campanha (OB Clinic)
- "A sua avaliação faz parte de uma condição especial da nossa campanha, então não há custo nesse primeiro momento 😊"
- ❌ Proibido: "grátis", "gratuita", "sem compromisso"

### Cortesia solidária (Vassoler)
- Avaliação em troca de **1kg de alimento não perecível**, doado para asilos e casas de repouso da região
- Sempre "cortesia solidária" / "avaliação de cortesia" — o agente demonstra **orgulho** do modelo
- Se perguntarem "é gratuita?": "A avaliação é uma cortesia solidária 💛 Pedimos apenas a contribuição de 1kg de alimento não perecível para os asilos da região."
- ❌ Proibido: "totalmente gratuita", "sem custo", "grátis"

---

## Múltiplos Dentistas com Dias Restritos (ex: OB Clinic)

- Regra **interna** — nunca revelar ao paciente (ex: Dr. Valter não atende terças; Dra. Eduarda não atende segundas e sextas)
- O sistema/n8n seleciona o profissional disponível; o agente usa "dentista responsável" antes do agendamento e `{{nome_profissional_sugerido}}` depois
- ❌ Proibido citar nome de dentista antes do agendamento confirmado
- No n8n: profissional principal + `profissional_fallback` com IDs do Clinicorp (ver `integracao-n8n.md`)

---

## Faixa Etária e Odontopediatria

| Modelo | Exemplo | Regra |
|---|---|---|
| Sem odontopediatria | OB Clinic (13+) | Lead menor que a idade mínima → `tag_Alerta` → `transferir_atendimento` |
| Com odontopediatria | Vassoler (1+), Instituto Frazão (2+) | Nunca recusar por idade; fluxo infantil abaixo |

### Atendimento Infantil
**No E1:** identificar menção de filho/filha/criança/neto; acolher com entusiasmo; coletar nome da criança, idade e motivo — um por mensagem; tom voltado ao responsável; adaptar linguagem ("o dentinho dele/dela").
**No E5:** verificar dias válidos da especialista; coletar nome do responsável (`nome_responsavel`); Pacto de Honra com campos 👤 Responsável e 👶 Criança.
**Constraints:** dias restritos da especialista; sedação como recurso disponível, não padrão; especialista mencionada pelo nome.
**No E8:** variante de despedida pediátrica.

---

## Duas Unidades (ex: Pedro Valença)

**No E4/E5:** perguntar unidade ANTES de `verificar_disponibilidade`:
> "Temos duas unidades em [Cidade] 😊 Qual fica mais perto: [U1] ou [U2]?"

**No Pacto de Honra:** incluir campo 🏥 Unidade. **No E8:** endereço da unidade confirmada.
**Campo extra no contexto:** `[UNIDADE: nome / nao_definida]`.
**Constraints:** proibido `verificar_disponibilidade` sem unidade confirmada.

---

## Dados Extras de Agendamento por Clínica

| Clínica | Dados obrigatórios | Nunca coletar |
|---|---|---|
| OB Clinic | Nome Completo + Telefone com DDD | nascimento, e-mail, CPF |
| Vassoler | Nome Completo + Telefone com DDD + **Bairro** | nascimento, e-mail, CPF |
| Legado v2 | Nome + Nascimento + Telefone (± Bairro) | — |

Na v3 o padrão é **não** coletar data de nascimento — confirmar com a clínica antes de incluir.

---

## Filtros de Agendamento

### Bloqueio por consulta recente
Ex: PDM, IP — bloqueio de 15 dias: verificar no E5 se já há consulta nos próximos X dias; se sim, informar e redirecionar para E7 ou E6.

### Feriados (v3 — todas as clínicas)
Consultar `[PREFIX]_BK_feriados.csv` no E4. Nunca oferecer nem confirmar data de feriado.

---

## RX Panorâmico Externo (ex: Pedro Valença)

- Mencionar no **E8**, após confirmar agendamento — nunca antes; apresentar como benefício, não exigência
- Tem: "Pode trazer ou enviar pelo WhatsApp 😊" / Não tem: "Sem problema, não é obrigatório." / Não sabe: "É uma chapinha dos dentes. Pode vir sem ela."
- Clínicas com radiologia própria (ex: OB Clinic tem panorâmica e tomógrafo): citar como diferencial no BK, não como exigência

---

## Objeção de Acompanhante

Quando o paciente diz que precisa consultar cônjuge/familiar:
> "Faz todo sentido! Que tal trazer essa pessoa na avaliação? Assim vocês saem com todas as informações."

Se aceitar → confirmar agendamento normalmente. Se declinar → tentar agendar com argumento de levar as informações depois.

---

## tag_Alerta — Quando Usar

Executar `tag_Alerta` → `transferir_atendimento` nas seguintes situações:
- Paciente agressivo ou com linguagem abusiva (após 2 tentativas de contorno)
- Loop de 3+ datas consecutivas sem disponibilidade
- Paciente pediu explicitamente para falar com humano
- Erro técnico em habilidade de sistema (ex: `realizar_agendamento` falhou)
- Lead abaixo da idade mínima (clínicas sem odontopediatria)
- Paciente antigo da clínica identificado no E7 (Caso B)
- Qualquer situação fora do fluxo que o agente não consegue resolver

A tag registra o alerta no CRM antes da transferência — o humano já sabe que houve um problema.

---

## O Que o Agente Gerencia Sozinho (nunca transbordar)

Remarcação (E6), cancelamento (E6) e consulta de agendamento (E7) são **operações do agente** — só transferir em erro técnico intransponível. Transbordo é reservado para: rispidez, pedido explícito de humano, dúvida factual fora do BK, caso clínico urgente, erro técnico, paciente antigo.
