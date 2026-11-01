import type { FormDefaults } from '@formtree/core'
import type { ReactElement, ReactNode } from 'react'

import { createContext, useContext, useMemo } from 'react'

const FORM_DEFAULTS = createContext<FormDefaults>({})

/**
 * Props of {@link FormtreeProvider}: defaults for every form below it.
 *
 * @category Form
 */
export interface FormtreeProviderProps extends FormDefaults {
  readonly children?: ReactNode
}

/**
 * Gives every form created with `useForm` below it these defaults. Options passed to `useForm` override them.
 *
 * @category Form
 */
export function FormtreeProvider({
  mode,
  reValidateMode,
  shouldFocusError,
  focusElement,
  formatError,
  children,
}: FormtreeProviderProps): ReactElement {
  const defaults = useMemo(
    () => ({ mode, reValidateMode, shouldFocusError, focusElement, formatError }),
    [mode, reValidateMode, shouldFocusError, focusElement, formatError],
  )
  return <FORM_DEFAULTS.Provider value={defaults}>{children}</FORM_DEFAULTS.Provider>
}

export function useFormDefaults(): FormDefaults {
  return useContext(FORM_DEFAULTS)
}
