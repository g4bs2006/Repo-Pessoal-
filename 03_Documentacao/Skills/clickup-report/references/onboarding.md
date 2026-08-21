# Onboarding de Nova Clínica — 6 Passos

Este arquivo é lido pelo `/clickup planejar` sempre que o trabalho identificado for
construção de agente novo ou onboarding de cliente. Os 6 passos definem a ordem de
execução padrão e informam as perguntas-chave geradas.

---

## Os 6 Passos (ordem obrigatória)

### 1. Construção do agente
Criar todos os arquivos do agente em `01_Clinicas/[ano-mês]/[cliente]/`:
- Configuracao: objetivo, regras e constraints, habilidades e tags
- Database: BK_estrutura, BK_localizacao, BK_objecoes, BK_feriados
- Prompts: persona + estágios E0 a E12

Referência: `03_Documentacao/Skills/agentes-odontologicos/agente-odontologico/SKILL.md`

### 2. Criação das etiquetas
Criar e configurar as etiquetas (tags) do cliente na plataforma de atendimento (Helena/WTS):
- Etiquetas de conversão: tag_Agendou, tag_Remarcou, tag_Cancelou, tag_Alerta
- Etiquetas de classificação de dor e urgência
- Etiquetas personalizadas definidas no arquivo `habilidades_tags_estrutura.md` do agente

### 3. Construção do painel
Criar o painel de acompanhamento do cliente.
- Padrão: integração Helena + Google Sheets (ou dashboard React se cliente multi-unidade)
- Referência: memória `project_dashboards_odontologicos.md`

### 4. Automações vinculadas ao painel
Criar os workflows n8n que conectam os eventos da Helena ao painel:
- Gatilhos: agendamento, remarcação, cancelamento, tag aplicada
- Referência: memória `project_automacao_leads_dinamica.md`

### 5. Botão de agendamento (somente Clinicorp)
Configurar o botão de agendamento integrado ao Clinicorp na interface do agente.
Pular esta etapa se o cliente não usar Clinicorp como sistema de gestão.

### 6. Testes
Validar todas as funcionalidades antes de ativar com leads reais:
- Fluxo completo E0 → E8 (conversa simulada)
- Etiquetas aplicadas corretamente em cada transição
- Painel recebendo dados
- Automações disparando nos eventos corretos
- Botão de agendamento (se Clinicorp)

---

## Perguntas-chave para onboarding novo

Quando o planejador detectar trabalho de onboarding, substituir as 3 perguntas padrão
por estas, que cobrem os pontos de decisão críticos dos 6 passos:

**P1 (Escopo — passo 1):**
Verificar se existe briefing/onboarding JSON na pasta do cliente. Se existir, perguntar:
"O briefing do onboarding já está completo ou ainda tem campos em aberto que vão
impactar a construção do agente (horários, formas de pagamento, diferenciais)?"

Se não existir JSON:
"Ainda não temos briefing do cliente. Como vamos levantar as informações — você já
tem os dados ou precisa coletar com o cliente antes de começar?"

**P2 (Contexto — passos 2 a 4):**
"O cliente usa qual sistema de gestão — Clinicorp, outro sistema ou não usa? Isso
define se o passo 5 (botão de agendamento) entra no escopo."

**P3 (Critério de pronto — passo 6):**
"Os testes vão ser feitos por nós antes de entregar, ou o cliente participa da
validação? E tem data de ativação definida?"

---

## Plano padrão gerado para onboarding

Quando todos os dados estiverem disponíveis, o plano de execução segue esta estrutura:

```
1. Construção do agente
   Pronto quando: todos os arquivos criados e revisados

2. Criação das etiquetas na plataforma
   Pronto quando: etiquetas configuradas e testadas na Helena/WTS

3. Construção do painel
   Pronto quando: painel exibindo dados corretamente

4. Automações vinculadas ao painel
   Pronto quando: workflows n8n disparando nos eventos corretos

5. Botão de agendamento [somente se Clinicorp]
   Pronto quando: botão funcional na interface do agente

6. Testes gerais
   Pronto quando: fluxo completo validado sem erros
```
