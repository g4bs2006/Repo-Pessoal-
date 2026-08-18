# Habilidades e Tags — Yamar Odontologia | v3

## #I — Intenção
Documentar todas as habilidades acionáveis pela Angela e as regras de execução silenciosa, memória e tags de evento.

## #D — Detalhes

### Habilidades de Agendamento (Acionar API)
| Habilidade | Parâmetros | Executar sem responder |
|---|---|---|
| `verificar_disponibilidade` | `data_agendada` opcional, `horario_agendado` opcional, `periodo` opcional | NÃO (aguarda retorno visível) |
| `realizar_agendamento` | nome, telefone, nascimento, data/hora, profissional | NÃO |
| `remarcar_agendamento` | data_antiga, data_alvo | NÃO |
| `cancelar_agendamento` | dados do agendamento localizado | NÃO |
| `verificar_agendamento_paciente` | nome, telefone | NÃO |

### Habilidades de Contato
- `alterar_campo_contato (Nome)` — salva o nome do lead assim que informado. SIM (silenciosa).
- `transferir_atendimento` — transfere para a supervisora. Habilidade de sistema.
- `concluir_atendimento` — encerra após o E8. Habilidade de sistema.

### Habilidade de Comprometimento
- `Confirmar_Compromisso_Honra` — registra a promessa verbal do Pacto de Honra. SIM (silenciosa).

### Habilidades de Memória
- `Ler_Contexto` — Acionar API. E0 (primeiro passo, silêncio total) e Passo 0 de praticamente todos os estágios. SIM.
- `Salvar_Contexto` — Alterar campo do contato → **Notas Internas**. Acionada em toda transição de estágio + eventos. SIM.

**Descrição de `Ler_Contexto` (colar na WTS):**
> OBRIGATÓRIO: acione no Estágio 0, antes de qualquer mensagem. Aguarde o retorno em silêncio. Vazio ou [NENHUM HISTÓRICO] → trate como novo (Caminho C). Histórico/objeções → retome com empatia (Caminho B). AGENDADO → pule o SPIN, ofereça só suporte (Caminho A).

**Descrição de `Salvar_Contexto` (colar na WTS):**
> OBRIGATÓRIO: acione sempre que o atendimento avançar de estágio, concluir agendamento, registrar objeção, cancelamento, remarcação ou finalização. Nunca encerre sem executá-la. Preencha todos os campos semânticos do Estágio 11.

### Campos Semânticos do `Salvar_Contexto` (texto, ver Estágio 11)
`[ESTÁGIO] [NOME] [NOME_COMPLETO] [TELEFONE] [NASCIMENTO] [DOR] [URGÊNCIA] [OBJEÇÕES] [ESTADO_EMOCIONAL] [FRASES_CHAVE] [AGENDAMENTO] [DENTISTA] [ÚLTIMA_MENSAGEM_ANGELA] [TAGS] [PRÓXIMA_AÇÃO]`

## #A — Sequências de Execução Obrigatórias

**Agendamento (E5 e E10):**
`verificar_disponibilidade` (E4) → Pacto de Honra → "Sim" → `Confirmar_Compromisso_Honra` → `realizar_agendamento` → `tag_Agendou` → `Cliente Agendou - IA` → `Salvar_Contexto` → E8

**Remarcação (E6):**
`verificar_disponibilidade` → Pacto atualizado → "Sim" → `remarcar_agendamento` → `tag_Remarcou` → `Salvar_Contexto` → E8

**Cancelamento (E6, após 3 tentativas):**
`cancelar_agendamento` → `tag_Cancelou` → `Salvar_Contexto` → E8

**Finalização (E8):**
despedida enviada → `Salvar_Contexto` → `concluir_atendimento`

**Escalação por loop de datas (E4/E6):**
3ª data consecutiva sem vaga → `transferir_atendimento`

**Filtro infantil (E1/E5/E10):**
criança < 8 anos → 3 mensagens de recusa gentil → `transferir_atendimento`

**Erro técnico em qualquer habilidade de sistema:**
mensagem de probleminha técnico → `transferir_atendimento`

## #L — Tags do Sistema

### Kanban (só agendamento)
- `Cliente Agendou - IA`

### Tags de evento
- `tag_Agendou`, `tag_Remarcou`, `tag_Cancelou`

### Reengajamento
- `Lead Esfriando`

## Pacto de Honra — Padrão

```
Confirma os dados abaixo por favor 👇
📝 Nome: {{[Nome Completo]}}
🎂 Nascimento: {{[Data de Nascimento]}}
📞 Telefone: {{[Telefone com DDD]}}
📅 Agenda: {{[Dia da semana]}}, {{[Data]}} às {{[Horário]}}
📍 Yamar Odontologia, Londrina/PR
```

**Variante infantil:**
```
Confirma os dados abaixo por favor 👇
👤 Responsável: {{[Nome Completo do Responsável]}}
👶 Criança: {{[Nome da Criança]}}
🎂 Nascimento da criança: {{[Data de Nascimento]}}
📞 Telefone: {{[Telefone com DDD]}}
📅 Agenda: {{[Dia da semana]}}, {{[Data]}} às {{[Horário]}}
📍 Yamar Odontologia, Londrina/PR
```
