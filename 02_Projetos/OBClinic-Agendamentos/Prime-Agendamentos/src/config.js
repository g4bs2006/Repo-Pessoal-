export const TOKEN = '***REMOVIDO***'
export const PANEL_ID = 'fd4df083-7422-4171-9ee2-1c098e799798'

export const STEPS = {
  crcA: '884ffe20-5cdb-4549-9301-07d38dc278a1',
  crcB: 'c86979eb-cb1f-43b4-aabf-f726a304d011',
}

export const STEP_NAMES = {
  '884ffe20-5cdb-4549-9301-07d38dc278a1': 'CRC A',
  'c86979eb-cb1f-43b4-aabf-f726a304d011': 'CRC B',
}

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
