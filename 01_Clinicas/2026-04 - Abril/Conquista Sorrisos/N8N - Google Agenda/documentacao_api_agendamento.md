# Documentação de Integração — Google Agenda (n8n)

Este documento contém os padrões de entrada (JSON) para o workflow de agendamento da clínica **Conquista Sorrisos**.

## 🚀 Padrões Gerais
- **Timezone:** America/Sao_Paulo
- **Formato de Data:** ISO 8601 (`YYYY-MM-DDTHH:mm:ss`)

---

## 1. Verificar Disponibilidade
Utilizado para consultar horários livres na agenda em tempo real.

| Variável | Descrição Detalhada para a LLM |
| :--- | :--- |
| `action` | **Estático:** Deve ser sempre `verificar_disponibilidade`. Define que o sistema deve apenas ler a agenda, sem gravar dados. |
| `data_iso` | **Dinâmico:** A data e hora exatas de interesse. **PRIORIDADE:** Se o paciente mencionar um horário específico (ex: "quinta às 14h"), capture e envie esse horário no formato `T14:00:00`. Se ele citar apenas o dia, use `T00:00:00`. Formato: `YYYY-MM-DDTHH:mm:ss`. |
| `periodo_preferencia` | **Dinâmico:** Extraído da fala do paciente. Use `manha` se ele citar "cedo" ou "antes do almoço"; use `tarde` se ele citar "depois do almoço" ou "fim do dia". Deixe vazio se não houver preferência. |

```json
{
  "action": "verificar_disponibilidade",
  "data_iso": "2026-04-25T00:00:00",
  "periodo_preferencia": "tarde"
}
```

---

## 2. Realizar Agendamento
Confirma a marcação definitiva e reserva o espaço no calendário.

| Variável | Descrição Detalhada para a LLM |
| :--- | :--- |
| `action` | **Estático:** Deve ser sempre `realizar_agendamento`. Comanda a criação de um novo evento no Google Calendar. |
| `nome_cliente` | **Dinâmico:** Nome completo do paciente conforme fornecido no Pacto de Honra. Nunca use apelidos ou apenas o primeiro nome. |
| `telefone_cliente` | **Dinâmico:** Telefone com DDD, extraído sem símbolos (apenas números). Formato esperado: `77988884444`. |
| `data_iso` | **Dinâmico:** O horário exato escolhido pelo paciente dentre as opções dadas ou o horário específico que ele já solicitou inicialmente. Formato rigoroso: `YYYY-MM-DDTHH:mm:ss`. |
| `spin` | **Dinâmico:** Um resumo textual da jornada SPIN. Deve incluir a dor principal e o impacto na vida do paciente (Ex: "Paciente com vergonha de sorrir, evita festas. Busca implante."). |

```json
{
  "action": "realizar_agendamento",
  "nome_cliente": "Gabriel Silva",
  "telefone_cliente": "77988614802",
  "data_iso": "2026-04-25T14:30:00",
  "spin": "Paciente relatou dor ao mastigar e insegurança com a prótese atual. Impacto na alimentação. Deseja reabilitação funcional."
}
```

---

## 3. Remarcar Agendamento
Altera um compromisso existente para um novo horário.

| Variável | Descrição Detalhada para a LLM |
| :--- | :--- |
| `action` | **Estático:** `remarcar_agendamento`. Comando para localizar um evento e movê-lo na agenda. |
| `nome_cliente` | **Dinâmico:** Nome completo usado no agendamento original para localização do registro. |
| `telefone_cliente` | **Dinâmico:** Telefone de contato do paciente para validação do vínculo. |
| `data_antiga_iso` | **Dinâmico/Memória:** A data e hora que estavam marcadas anteriormente. Busque este dado no `Ler_Contexto`. Se não encontrar isso no retorno da habilidade peça novamente ao cliente essas informações. |
| `data_iso` | **Dinâmico:** A nova data e hora exatas que o paciente escolheu para a remarcação. Se ele informou um horário específico, capture-o rigorosamente. |

```json
{
  "action": "remarcar_agendamento",
  "nome_cliente": "Gabriel Silva",
  "telefone_cliente": "77988614802",
  "data_antiga_iso": "2026-04-25T14:30:00",
  "data_iso": "2026-04-26T09:00:00"
}
```

---

## 4. Cancelar Agendamento
Remove o compromisso da agenda após falha na retenção.

| Variável | Descrição Detalhada para a LLM |
| :--- | :--- |
| `action` | **Estático:** `cancelar_agendamento`. Comando para deletar o evento do calendário. |
| `nome_cliente` | **Dinâmico:** Nome completo do paciente para identificação do compromisso. |
| `telefone_cliente` | **Dinâmico:** Telefone para confirmação de identidade. |
| `data_iso` | **Dinâmico/Memória:** A data e hora exatas do agendamento que será cancelado. Busque no contexto anterior. |

```json
{
  "action": "cancelar_agendamento",
  "nome_cliente": "Gabriel Silva",
  "telefone_cliente": "77988614802",
  "data_iso": "2026-04-25T14:30:00"
}
```

---

## 5. Verificar Agendamento (Paciente)
Consulta se o paciente já possui algum horário marcado no sistema.

| Variável | Descrição Detalhada para a LLM |
| :--- | :--- |
| `action` | **Estático:** `verificar_agendamento_paciente`. Comando de busca por agendamentos ativos. |
| `nome_cliente` | **Dinâmico:** Nome completo ou primeiro nome do paciente para indexação da busca. |
| `telefone_cliente` | **Dinâmico:** O número de telefone principal do paciente. É a chave primária de busca. |

```json
{
  "action": "verificar_agendamento_paciente",
  "nome_cliente": "Gabriel Silva",
  "telefone_cliente": "77988614802"
}
```
