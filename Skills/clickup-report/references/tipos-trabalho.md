# Taxonomy de Tipos de Trabalho — Roteamento para Seções ClickUp

## Tabela de Roteamento

| Tipo de trabalho | Seção ClickUp | Prefixo no comentário |
|---|---|---|
| Construção inicial de agente (do zero) | Mapeamento Inicial | `[MAPEAMENTO INICIAL]` |
| Configuração de persona / regras / prompts | Mapeamento Inicial | `[MAPEAMENTO INICIAL]` |
| Criação de banco de dados (CSVs, objections) | Mapeamento Inicial | `[MAPEAMENTO INICIAL]` |
| Ajuste de estágio / fluxo de conversa | Mapeamento Inicial | `[MAPEAMENTO INICIAL]` |
| Correção de bug reportado pelo cliente | Demandas | `[DEMANDAS]` |
| Mudança solicitada pelo cliente | Demandas | `[DEMANDAS]` |
| Atualização de horário / endereço / regra | Demandas | `[DEMANDAS]` |
| Adição de nova funcionalidade pós-entrega | Demandas | `[DEMANDAS]` |
| Feedback positivo / elogio recebido | Sucesso | `[SUCESSO]` |
| Resultado mensurado (conversão, taxa de agendamento) | Sucesso | `[SUCESSO]` |
| Caso de uso bem-sucedido | Sucesso | `[SUCESSO]` |
| Chave de API adicionada/atualizada | Dados | `[DADOS]` |
| Contato técnico do cliente identificado | Dados | `[DADOS]` |
| Link de documentação / repositório | Dados | `[DADOS]` |
| Credencial de acesso | Dados | `[DADOS]` |

---

## Categorias de Sessão

### CONSTRUÇÃO (→ Mapeamento Inicial)

Sessão onde o agente foi construído do zero ou configurado pela primeira vez.

Indicadores:
- Foram criados arquivos `.md` novos em `Configuracao/`, `Prompts*/`, `Database/`
- `git diff --stat` mostra dezenas de arquivos novos
- Assunto da conversa foi "construção", "criação", "novo agente", "do zero"

### MANUTENÇÃO (→ Demandas)

Sessão onde algo existente foi corrigido, alterado ou expandido.

Indicadores:
- Foram modificados arquivos já existentes
- Usuário mencionou "corrigir", "mudar", "atualizar", "ajustar", "o cliente pediu"
- Bug foi identificado e corrigido

### ENTREGA / FEEDBACK (→ Sucesso)

Sessão onde foi documentado um resultado positivo.

Indicadores:
- Usuário trouxe print, relato ou dados de performance positivos
- Tema foi "funcionou", "aprovado", "fechou", "agendou"

### CONFIGURAÇÃO TÉCNICA (→ Dados)

Sessão onde foi registrado algo técnico ou burocrático.

Indicadores:
- Tema foi tokens, APIs, chaves, integrações
- Foram registrados contatos, links, credenciais

---

## Sessões Mistas

Quando a sessão cobrir mais de um tipo, **postar em mais de uma seção**. Exemplo:

Sessão que construiu o agente E configurou a API → postar em Mapeamento Inicial E em Dados.

Regra: cada comentário tem o prefixo da seção no início para indicar onde "pertence" visualmente.

---

## Exemplos de classificação rápida

| Descrição da sessão | Seção |
|---|---|
| "Construímos o agente Haline para Oral Concept, 21 arquivos" | Mapeamento Inicial |
| "Corrigimos o horário de funcionamento da clínica" | Demandas |
| "Cliente enviou feedback: taxa de agendamento subiu 40%" | Sucesso |
| "Adicionamos o token da API Helena ao sistema" | Dados |
| "Ajustamos o E4 para bloquear horários da Dra. Letícia nas terças" | Demandas |
| "Criamos os 13 estágios E0-E12 do agente BAZACAS" | Mapeamento Inicial |
