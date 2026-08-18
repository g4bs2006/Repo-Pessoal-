# Planejamento e Decisões — IA Jéssica (Conquista Sorrisos)

Este documento registra todas as decisões, regras de negócio e o progresso da construção do agente Jéssica até o presente momento.

---

## 1. Identidade e Base
- **Agente:** Jéssica
- **Função:** SDR (Sales Development Representative)
- **Clínica:** Conquista Sorrisos
- **Arquitetura Base:** Padrão "agente-odontologico" referenciando os estágios de "Francisco Junior".
- **Objetivo:** Qualificar leads, aplicar funil SPIN e agendar avaliação sem atrito, tratando objeções.

## 2. Decisões Estruturais Tomadas
1. **Banco de Conhecimento (BK):**
   - Decidido que todo o Banco de Conhecimento (Estrutura, Localização e Objeções) será formatado **exclusivamente em arquivos `.csv`**.
   - Os dados de estrutura foram inseridos (Clínica com todas as áreas, aberta no almoço, laboratório próprio, RX panorâmico interno sem necessidade de agendamento prévio).

2. **Estágio 0 (Recepção):**
   - Removida a mensagem padrão de transbordo no início ("vou passar para a consultora").
   - **Novo fluxo E0:** Paciente envia a primeira mensagem ➔ IA aciona `Ler_Contexto` em silêncio ➔ IA dá as boas vindas, apresenta a clínica e se identifica como Jéssica (Caminhos A, B ou C baseados no contexto).

3. **Sistema de Memória (Estágio 11 e Salvar Contexto):**
   - O `Salvar_Contexto` não é mais exclusivo do final do atendimento. Ele será **salvo estágio a estágio**.

4. **Estrutura Padrão Obrigatória de Memória (Para todos os estágios):**
   Sempre que o `Salvar_Contexto` for acionado, o formato a ser utilizado nos prompts de todos os estágios deve conter exatos dois parágrafos em texto corrido:
   
   **Parágrafo 1 (Resumo):**
   "Estágio [Atual] concluído. Paciente [Nome] com dor do tipo [Dor] e urgência [Urgência]. Motivo do contato: [Motivo]. Objeções: [Objeções/Nenhuma]. Agendamento: [Agendamento/Nenhum]. Tags aplicadas: [Tags]. Ações futuras: [Próximo passo]."
   
   **Parágrafo 2 (Autoavaliação):**
   "Autoavaliação: O que foi bom: [O que fluiu bem no estágio]. O que foi ruim: [Possíveis dificuldades ou atritos na conversa]."
   
   *(O formato em blocos/categorias está banido e essa regra de dois parágrafos será replicada em todos os próximos estágios que criarmos).*

5. **Nova Estruturação de Estágios (Padrão Mayara/Iara):**
   - Os estágios agora incluem os blocos **Identidade** e **#P (Pré-requisitos para Avançar)**.
   - *Nota:* Decidimos NÃO utilizar a Regra de Fragmentação (enviar mensagens a cada emoji) nesta IA.
   - Foi adotada a regra de agendamento antecipado direcionando pro **E10 (Bypass)**.

## 3. Progresso de Criação de Arquivos
**Fundação e BK (Concluídos) ✅**
- `CONQUISTA_objetivo_agente.md`
- `CONQUISTA_regras_sistema_constraints.md`
- `CONQUISTA_BK_localizacao.csv`
- `CONQUISTA_BK_estrutura.csv`
- `CONQUISTA_BK_objecoes.csv`
- `CONQUISTA_BK_feriados.csv` ✅ (Novo: Gestão dinâmica de datas bloqueadas)

**Estágios (Em andamento) ⏳**
- `CONQUISTA_estagio_0_recepcao.md` ✅ (Adaptado ao novo fluxo inicial)
- `CONQUISTA_estagio_11_memoria.md` ✅ (Adaptado ao salvamento por estágio)
- `CONQUISTA_estagio_1_acolhimento_situacao.md` ✅ (Coleta de nome e primeira dor, com bloco de contexto atualizado)
- `CONQUISTA_estagio_2_problema_implicacao.md` ✅ (Implicação da dor e validação com escuta ativa genuína)
- `CONQUISTA_estagio_3_necessidade_convite.md` ✅ (Projeção da solução e convite englobando o Raio-X panorâmico interno)
- `CONQUISTA_estagio_4_verificar_disponibilidade.md` ✅ (Consultar agenda via `verificar_disponibilidade` e validar contra `CONQUISTA_BK_feriados.csv`)
- `CONQUISTA_estagio_5_agendamento_pacto_honra.md` ✅ (Coleta de dados, Pacto de Honra e agendamento)
- `CONQUISTA_estagio_6_retencao.md` ✅ (Gestão de remarcações e cancelamentos com 3 tentativas de retenção)
- `CONQUISTA_estagio_7_verificacao.md` ✅ (Verificação de agendamentos ativos e triagem de pacientes antigos)
- `CONQUISTA_estagio_8_finalizacao.md` ✅ (Confirmação final, localização e encerramento humanizado)
- `CONQUISTA_estagio_9_objecoes.md` ✅ (Tratamento de dúvidas e resistências via BK)
- `CONQUISTA_estagio_10_bypass.md` ✅ (Agendamento direto na 3ª insistência)
- **Fluxo Concluído!** 🚀
