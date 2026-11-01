/**
 * Vue Devtools integration for formtree: every form created with `useForm`, its node tree and node states in an
 * inspector, and what happens in it on a timeline. Read-only.
 *
 * @module @formtree/vue/devtools
 */
import type { App } from 'vue'
import type { RegisteredForm } from '../form-registry'
import type { DevtoolsApi } from './devtools-api'

import { setupDevtoolsPlugin } from '@vue/devtools-api'

import { FORM_REGISTRY } from '../form-registry'
import { inspectedNode, inspectorState, inspectorTree } from './inspector'
import { timelineEventOf } from './timeline'

const PLUGIN_ID = 'formtree'
const INSPECTOR_ID = 'formtree'
const TIMELINE_LAYER_ID = 'formtree'
const BRAND_COLOR = 0x0b7a63
const INSPECTOR_ICON = 'dynamic_form'
const SIDEBAR_ICON = 'custom-ic-baseline-dynamic-form'

interface DevtoolsSession {
  readonly forms: Map<string, RegisteredForm>
  api: DevtoolsApi | undefined
  formCount: number
}

/**
 * Shows the forms of the app in Vue Devtools. Every form created with `useForm` inside the app appears in the formtree
 * inspector, labelled with the component that created it, and its changes, checks and submits appear on the timeline.
 * Nothing can be edited from the devtools.
 *
 * @category Devtools
 */
export function formtreeDevtools(app: App): void {
  const session: DevtoolsSession = { forms: new Map(), api: undefined, formCount: 0 }
  app.provide(FORM_REGISTRY, { register: entry => addForm(session, entry) })
  setupDevtoolsPlugin(
    { id: PLUGIN_ID, label: 'formtree', packageName: '@formtree/vue', logo: SIDEBAR_ICON, app },
    api => connect(session, api),
  )
}

function addForm(session: DevtoolsSession, entry: RegisteredForm): () => void {
  session.formCount += 1
  const formKey = String(session.formCount)
  session.forms.set(formKey, entry)
  const stopObserving = entry.form.observe(event => {
    const api = session.api
    api?.addTimelineEvent({ layerId: TIMELINE_LAYER_ID, event: timelineEventOf({ entry, event, time: api.now() }) })
  })
  const stopListening = entry.form.subscribe(() => refreshInspector(session))
  refreshInspector(session)
  return () => {
    stopObserving()
    stopListening()
    session.forms.delete(formKey)
    refreshInspector(session)
  }
}

function connect(session: DevtoolsSession, api: DevtoolsApi): void {
  session.api = api
  api.addInspector({
    id: INSPECTOR_ID,
    label: 'formtree',
    icon: INSPECTOR_ICON,
    treeFilterPlaceholder: 'Search nodes',
    noSelectionText: 'Select a form or a node',
  })
  api.addTimelineLayer({ id: TIMELINE_LAYER_ID, label: 'formtree', color: BRAND_COLOR })
  api.on.getInspectorTree(payload => {
    if (payload.inspectorId == INSPECTOR_ID) {
      payload.rootNodes = inspectorTree(session.forms, payload.filter)
    }
  })
  api.on.getInspectorState(payload => {
    const node = payload.inspectorId == INSPECTOR_ID ? inspectedNode(session.forms, payload.nodeId) : undefined
    if (node != undefined) {
      payload.state = inspectorState(node)
    }
  })
}

function refreshInspector(session: DevtoolsSession): void {
  session.api?.sendInspectorTree(INSPECTOR_ID)
  session.api?.sendInspectorState(INSPECTOR_ID)
}
