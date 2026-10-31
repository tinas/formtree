/**
 * Vue adapter for formtree. Re-exports @formtree/core.
 *
 * @module @formtree/vue
 */
export * from '@formtree/core'
export { provideFormNode, useFormNode } from './node-context'
export type { AnyGroupNode } from './node-context'
export { useField } from './use-field'
export type { FieldBindingAttributes, FieldView } from './use-field'
export { useForm } from './use-form'
export type { UseFormArguments, UseFormOptionsWithDeps } from './use-form'
