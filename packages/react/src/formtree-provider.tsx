import type { FormDefaults } from '@formtree/core'
import type { ReactElement, ReactNode } from 'react'

import { createContext, useContext, useMemo } from 'react'

const FORM_DEFAULTS = createContext<FormDefaults>({})
const LANGUAGE = createContext<string | undefined>(undefined)

/**
 * Props of {@link FormtreeProvider}: defaults for every form below it.
 *
 * @category Form
 */
export interface FormtreeProviderProps extends FormDefaults {
  /**
   * The current language. When it changes, every component that reads a form below re-renders, so a `formatError`
   * that reads the language shows its messages in the new one.
   */
  readonly language?: string
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
  language,
  children,
}: FormtreeProviderProps): ReactElement {
  const defaults = useMemo(
    () => ({ mode, reValidateMode, shouldFocusError, focusElement, formatError }),
    [mode, reValidateMode, shouldFocusError, focusElement, formatError],
  )
  return (
    <FORM_DEFAULTS.Provider value={defaults}>
      <LANGUAGE.Provider value={language}>{children}</LANGUAGE.Provider>
    </FORM_DEFAULTS.Provider>
  )
}

export function useFormDefaults(): FormDefaults {
  return useContext(FORM_DEFAULTS)
}

export function useLanguage(): string | undefined {
  return useContext(LANGUAGE)
}
