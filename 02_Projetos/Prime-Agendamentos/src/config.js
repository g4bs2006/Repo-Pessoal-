export const TOKEN = '***REMOVIDO***'
export const PANEL_ID = 'fd4df083-7422-4171-9ee2-1c098e799798'

export const STEPS = {
  crcA: '884ffe20-5cdb-4549-9301-07d38dc278a1',
  crcB: 'c86979eb-cb1f-43b4-aabf-f726a304d011',
}

export const STEP_NAMES = {
  '884ffe20-5cdb-4549-9301-07d38dc278a1': 'CRC A',
  'c86979eb-cb1f-43b4-aabf-f726a304d011': 'CRC B',
  'a3202605-7c42-487e-a206-32372c48d379': 'Agendou',
  'aa4432f7-881b-4656-b839-522b28063a98': 'NÃ£o Agendou',
  '313cc387-21b9-4fe9-aa2e-ebd03d1b586f': 'Faltou',
  '70093584-337b-49d1-82a1-6278f879d9ac': 'Primeiro Dia',
  'ccf33c75-1e91-4d5e-a312-a190321687ab': 'Segundo Dia',
  '6847efed-d379-4623-afa1-fa873ab86cdc': 'Terceiro Dia',
  '42ee73a2-d18e-4987-bdd4-2d4dd8a61565': 'NÃ£o Fechou',
  '7be52b52-6eaa-4f85-ba37-86f98e82cb6b': 'Entrada Programada',
  'be2ce573-91cf-4fd3-a15c-ad1949e9d0d6': 'Protocolo/PT',
  '403c21d7-da9d-4cdc-90e2-6e431976d65b': 'Pacientes',
}

export const STEP_LIST = [
  { id: 'a3202605-7c42-487e-a206-32372c48d379', label: 'Agendou' },
  { id: 'aa4432f7-881b-4656-b839-522b28063a98', label: 'NÃ£o Agendou' },
  { id: '313cc387-21b9-4fe9-aa2e-ebd03d1b586f', label: 'Faltou' },
  { id: '70093584-337b-49d1-82a1-6278f879d9ac', label: 'Primeiro Dia' },
  { id: 'ccf33c75-1e91-4d5e-a312-a190321687ab', label: 'Segundo Dia' },
  { id: '6847efed-d379-4623-afa1-fa873ab86cdc', label: 'Terceiro Dia' },
  { id: '42ee73a2-d18e-4987-bdd4-2d4dd8a61565', label: 'NÃ£o Fechou' },
  { id: '7be52b52-6eaa-4f85-ba37-86f98e82cb6b', label: 'Entrada Programada' },
  { id: 'be2ce573-91cf-4fd3-a15c-ad1949e9d0d6', label: 'Protocolo/PT' },
  { id: '403c21d7-da9d-4cdc-90e2-6e431976d65b', label: 'Pacientes' },
]

export const TAGS = {
  MastigaÃ§Ã£o: '5c735bac-3286-45cb-95aa-bcd6e97a2ffc',
  EstÃ©tica: '8f57a996-bc26-47ac-b8b8-ee72da1044fe',
  Alta: '19b22c78-dcd0-44b0-9b27-16aa67c9d58d',
  Baixa: '1e3fabcf-905f-4902-9758-4758c4324547',
  Agendado: '47870808-399c-45c3-b056-a2c66c8ae337'
}

// ExibiÃ§Ã£o das tags na interface (rÃ³tulo + ID)
export const TAG_LIST = [
  { id: TAGS.Agendado,   label: 'Agendado',   locked: true  },
  { id: TAGS.MastigaÃ§Ã£o, label: 'MastigaÃ§Ã£o',  locked: false },
  { id: TAGS.EstÃ©tica,   label: 'EstÃ©tica',    locked: false },
  { id: TAGS.Alta,       label: 'Alta UrgÃªncia', locked: false },
  { id: TAGS.Baixa,      label: 'Baixa UrgÃªncia', locked: false },
]

export const CLINICORP_PROFESSIONALS = [
  { id: '4693001712435200', name: 'Rafael da Cunha Santos' },
  { id: '5010362672742400', name: 'Anayle PaixÃ£o Silva' },
  { id: '6525572572774400', name: 'Alex Fernando Santos da Silva' },
  { id: '6548129122615296', name: 'Emerson Gomes' },
]
