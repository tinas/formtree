export const DEFINITION_KIND = {
  field: 'field',
  group: 'group',
  array: 'array',
} as const

export type DefinitionKind = (typeof DEFINITION_KIND)[keyof typeof DEFINITION_KIND]
