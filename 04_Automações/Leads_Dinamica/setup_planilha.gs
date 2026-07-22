/**
 * Configura a planilha de clínicas para a automação de leads (Helena + n8n).
 * Funciona tanto vinculado a uma planilha (Extensões > Apps Script) quanto
 * standalone (script.google.com) — neste caso cria uma planilha nova.
 *
 * COMO USAR: cole este código no Apps Script e rode setup().
 * Na primeira execução o Google pede autorização — aceite.
 * Ao terminar, veja a URL da planilha em "Registros de execução" (Ctrl+Enter / View > Logs).
 */

// Nomes EXATOS das colunas (precisam bater com o que o n8n espera). Não alterar.
var CABECALHO = [
  'helena_company_id', 'nome', 'helena_token', 'panel_id', 'step_id', 'ativo',
  'fb_tag_nome', 'fb_panel_tag_id', 'fb_contact_tag_id',
  'ig_tag_nome', 'ig_panel_tag_id', 'ig_contact_tag_id',
  'org_tag_nome', 'org_panel_tag_id', 'org_contact_tag_id', 'status_obs'
];

// Linha de exemplo (clínica ATOS) — já pronta para testar o Workflow 1.
var LINHA_ATOS = [
  '79a15d58-9d7b-4420-a75e-985267e9c8ed',
  'Atos Odontologia',
  'pn_7PEG91xSt3kCPnqplUOu52ww9nDjNAlr5lbuUkYdI',
  '3b98f0bf-fea4-47b7-a922-2f3981220722',
  '6f418246-8f5a-4c7e-a63b-31e177deed25',
  'true',
  'Facebook', 'fb7781a8-9e21-4241-a7d7-ee8e82ffbf6c', '0a6eca24-bf61-4dc6-b607-9b35db4e7cfc',
  'Instagram', '9dd2d9ca-41d5-4f67-b445-2dc73efe6b2b', 'ec81194d-5d4a-4d03-b954-2bb9cab71069',
  'Orgânico', '5c74d4d0-8222-4f2f-999b-f60a96bed915', '28a025a3-3cf1-4b17-b91c-016e21b96477',
  'ok'
];

function setup() {
  // Usa a planilha ativa (script vinculado) OU cria uma nova (script standalone)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var criada = false;
  if (!ss) {
    ss = SpreadsheetApp.create('Clinicas - Automacao Leads');
    criada = true;
  }

  // 1) Cria ou limpa a aba "clinicas"
  var aba = ss.getSheetByName('clinicas');
  if (aba) {
    aba.clear();
    aba.clearDataValidations();
  } else {
    aba = ss.insertSheet('clinicas');
  }

  var totalCols = CABECALHO.length;

  // 2) Tudo como TEXTO PURO (impede o Sheets de converter UUIDs em número/data)
  aba.getRange(1, 1, aba.getMaxRows(), totalCols).setNumberFormat('@');

  // 3) Cabeçalho + 4) linha de exemplo (ATOS)
  aba.getRange(1, 1, 1, totalCols).setValues([CABECALHO]);
  aba.getRange(2, 1, 1, totalCols).setValues([LINHA_ATOS]);

  // 5) Formatação do cabeçalho
  aba.getRange(1, 1, 1, totalCols)
     .setFontWeight('bold').setBackground('#f0f0f0').setHorizontalAlignment('center');
  aba.setFrozenRows(1);

  // 6) Validação na coluna "ativo" (apenas true/false via dropdown)
  var colAtivo = CABECALHO.indexOf('ativo') + 1;
  var regra = SpreadsheetApp.newDataValidation()
     .requireValueInList(['true', 'false'], true).setAllowInvalid(false).build();
  aba.getRange(2, colAtivo, aba.getMaxRows() - 1, 1).setDataValidation(regra);

  // 7) Ajusta largura das colunas
  aba.autoResizeColumns(1, totalCols);

  // 8) Remove a aba padrão vazia, se houver
  var padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (padrao && padrao.getName() !== 'clinicas') ss.deleteSheet(padrao);

  // 9) Mensagem final (Logger funciona em qualquer contexto)
  var url = ss.getUrl();
  Logger.log('Pronto! Aba "clinicas" configurada com a linha da ATOS.');
  Logger.log('Planilha: ' + url);
  if (criada) Logger.log('(Planilha NOVA criada — copie a URL acima.)');
}
